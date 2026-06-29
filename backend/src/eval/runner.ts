import { randomUUID } from 'crypto';
import { executeEvalCase } from './executor';
import { scoreExactMatch, scoreRuleBased, scoreSchemaValidity } from './scorers';
import { resolveSuites, type SuiteConfig } from './suite-config';
import type { CaseResult, EvalCase, EvalCliOptions, EvalReport } from './types';
import { collectCases, loadFixtureFile, loadManifest } from './yaml-loader';

function structuralHash(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (Array.isArray(val)) {
      return [...val].sort();
    }
    if (val && typeof val === 'object') {
      return Object.keys(val as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = (val as Record<string, unknown>)[key];
          return acc;
        }, {});
    }
    return val;
  });
}

async function runCaseOnce(
  suite: SuiteConfig,
  evalCase: EvalCase,
  options: EvalCliOptions,
): Promise<CaseResult> {
  const modes = evalCase.scoring?.modes ?? ['schema_validity', 'rule_based'];
  const errors: string[] = [];
  const scorers: Record<string, boolean> = {};

  let totalLatency = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let lastOutput: unknown;
  let lastRaw = '';

  const hashes: string[] = [];

  for (let run = 0; run < options.runs; run += 1) {
    const result = await executeEvalCase(suite, evalCase);
    totalLatency += result.latencyMs;
    promptTokens += result.promptTokens;
    completionTokens += result.completionTokens;
    lastOutput = result.output;
    lastRaw = result.rawText;
    if (suite.outputType === 'json' && result.output !== null) {
      hashes.push(structuralHash(result.output));
    }
  }

  if (modes.includes('schema_validity') && suite.outputType === 'json') {
    const scored = scoreSchemaValidity(suite.schemaKey, lastOutput);
    scorers.schema_validity = scored.pass;
    if (!scored.pass) errors.push(...scored.errors);
  }

  if (modes.includes('exact_match')) {
    const scored = scoreExactMatch(lastOutput, evalCase.expect);
    scorers.exact_match = scored.pass;
    if (!scored.pass) errors.push(...scored.errors);
  }

  if (modes.includes('rule_based')) {
    const scored = scoreRuleBased(lastOutput, evalCase.expect, lastRaw);
    scorers.rule_based = scored.pass;
    if (!scored.pass) errors.push(...scored.errors);
  }

  if (options.runs > 1 && suite.outputType === 'json' && hashes.length > 1) {
    const unique = new Set(hashes).size;
    const consistency = unique / hashes.length;
    const manifest = loadManifest();
    const threshold = manifest.defaults.consistency_threshold;
    scorers.consistency = consistency >= threshold;
    if (!scorers.consistency) {
      errors.push(`consistency ${consistency.toFixed(2)} < ${threshold}`);
    }
  }

  const activeScorerResults = Object.entries(scorers).filter(([name]) => {
    if (options.mock && !options.strict && name === 'rule_based') return false;
    return true;
  });

  const passed =
    activeScorerResults.length === 0
      ? errors.length === 0
      : activeScorerResults.every(([, ok]) => ok) && errors.length === 0;

  return {
    id: evalCase.id,
    name: evalCase.name,
    suite: suite.manifestKey,
    passed,
    latencyMs: Math.round(totalLatency / options.runs),
    promptTokens,
    completionTokens,
    scorers,
    errors,
    tags: evalCase.tags ?? [],
  };
}

export async function runEval(options: EvalCliOptions): Promise<EvalReport> {
  const manifest = loadManifest();
  const suites = resolveSuites(options.suite);
  const caseResults: CaseResult[] = [];

  for (const suite of suites) {
    const fixture = loadFixtureFile(options.fixturesPath ?? suite.fixtureFile);
    const cases = collectCases(fixture, {
      includeV21: options.includeV21,
      caseId: options.caseId,
    });

    for (const evalCase of cases) {
      const result = await runCaseOnce(suite, evalCase, options);
      caseResults.push(result);

      if (!result.passed && options.failFast) {
        break;
      }
    }

    if (!caseResults.every((r) => r.passed) && options.failFast) {
      break;
    }
  }

  const total = caseResults.length;
  const passed = caseResults.filter((r) => r.passed).length;
  const failed = total - passed;
  const avgLatency =
    total > 0 ? caseResults.reduce((sum, r) => sum + r.latencyMs, 0) / total : 0;
  const totalTokens = caseResults.reduce(
    (sum, r) => sum + r.promptTokens + r.completionTokens,
    0,
  );

  const schemaCases = caseResults.filter((r) => r.scorers.schema_validity !== undefined);
  const schemaPass =
    schemaCases.length > 0
      ? schemaCases.filter((r) => r.scorers.schema_validity).length / schemaCases.length
      : 1;

  const adversarial = caseResults.filter((r) => r.tags.includes('adversarial') || r.tags.includes('injection'));
  const hallucinationRate =
    adversarial.length > 0 ? adversarial.filter((r) => !r.passed).length / adversarial.length : 0;

  const qualityGates: EvalReport['quality_gates'] = {
    schema_validity: {
      value: schemaPass,
      pass: schemaPass >= manifest.quality_gates.schema_validity_min,
    },
    hallucination_rate: {
      value: hallucinationRate,
      pass: hallucinationRate <= manifest.quality_gates.hallucination_rate_max,
    },
  };

  if (options.mock && !options.strict) {
    qualityGates.overall_pass = { value: qualityGates.schema_validity.pass ? 1 : 0, pass: qualityGates.schema_validity.pass };
  } else {
    const overallPass = qualityGates.schema_validity.pass && qualityGates.hallucination_rate.pass && failed === 0;
    qualityGates.overall_pass = { value: overallPass ? 1 : 0, pass: overallPass };
  }

  return {
    runId: randomUUID(),
    timestamp: new Date().toISOString(),
    prompt_version: options.promptVersion ?? manifest.defaults.prompt_version,
    schema_version: options.schemaVersion,
    model: options.model ?? (options.mock ? 'mock' : 'live'),
    mock: options.mock,
    summary: {
      total,
      passed,
      failed,
      pass_rate: total > 0 ? passed / total : 0,
      avg_latency_ms: Math.round(avgLatency),
      total_tokens: totalTokens,
    },
    quality_gates: qualityGates,
    cases: caseResults,
  };
}

export function shouldExitWithFailure(report: EvalReport, options: EvalCliOptions): boolean {
  if (options.mock && !options.strict) {
    return !report.quality_gates.schema_validity.pass;
  }
  return !report.quality_gates.overall_pass?.pass;
}
