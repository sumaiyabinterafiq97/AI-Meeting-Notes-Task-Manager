#!/usr/bin/env node
/**
 * Prompt evaluation CLI — loads YAML fixtures and scores agent outputs.
 * @see backend/prompts/evaluations/eval-runner-spec.md
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

function parseArgs(argv: string[]) {
  const options = {
    suite: 'all',
    fixturesPath: undefined as string | undefined,
    promptVersion: undefined as string | undefined,
    schemaVersion: '2.0' as '2.0' | '2.1',
    model: undefined as string | undefined,
    mock: true,
    runs: 1,
    caseId: undefined as string | undefined,
    includeV21: false,
    outputPath: undefined as string | undefined,
    failFast: false,
    strict: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case '--suite':
      case '--agent':
        options.suite = next ?? options.suite;
        i += 1;
        break;
      case '--fixtures':
        options.fixturesPath = next;
        i += 1;
        break;
      case '--prompt-version':
        options.promptVersion = next;
        i += 1;
        break;
      case '--schema-version':
        options.schemaVersion = (next === '2.1' ? '2.1' : '2.0') as '2.0' | '2.1';
        i += 1;
        break;
      case '--model':
        options.model = next;
        i += 1;
        break;
      case '--mock':
        options.mock = true;
        break;
      case '--live':
        options.mock = false;
        break;
      case '--runs':
        options.runs = Math.max(1, Number(next ?? 1));
        i += 1;
        break;
      case '--case':
        options.caseId = next;
        i += 1;
        break;
      case '--include-v21':
        options.includeV21 = true;
        break;
      case '--output':
        options.outputPath = next;
        i += 1;
        break;
      case '--fail-fast':
        options.failFast = true;
        break;
      case '--strict':
        options.strict = true;
        break;
      default:
        break;
    }
  }

  return options;
}

function applyCliEnv(cli: ReturnType<typeof parseArgs>): void {
  process.env.AI_USE_MOCK = cli.mock ? 'true' : 'false';
  process.env.PROMPT_SCHEMA_V2_1 = cli.schemaVersion === '2.1' ? 'true' : 'false';
  process.env.NODE_ENV = process.env.NODE_ENV ?? 'development';
}

async function assertLiveProvidersReady(): Promise<void> {
  const { resolveProviderChain } = await import('../src/modules/llm');
  const chain = resolveProviderChain('summarizer');

  if (chain.length > 0) {
    console.error(`Live eval providers: ${chain.join(' → ')}`);
    return;
  }

  const hints = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GOOGLE_API_KEY',
    'LOCAL_LLM_BASE_URL',
  ].filter((key) => !process.env[key]);

  console.error(`
Live eval failed: no LLM provider is configured.

--live sets AI_USE_MOCK=false, so the mock provider is disabled.
Your .env has AI_USE_MOCK=true but no provider API keys.

Add at least one key to .env (repo root or backend/):
  OPENAI_API_KEY=sk-...          # recommended (LLM_PRIMARY_PROVIDER=openai)
  ANTHROPIC_API_KEY=sk-ant-...
  GOOGLE_API_KEY=...

Missing in your environment: ${hints.join(', ') || 'none detected — check key format'}

Then re-run:
  npm run eval:prompts -- --live --strict --suite all

For local dev without API keys, use mock mode instead:
  npm run eval:prompts -- --mock --suite all
`);
  process.exit(1);
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));

  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
  applyCliEnv(cli);

  if (!cli.mock) {
    await assertLiveProvidersReady();
  }

  const { runEval, shouldExitWithFailure } = await import('../src/eval/runner');
  const report = await runEval(cli);
  const json = JSON.stringify(report, null, 2);

  if (cli.outputPath) {
    fs.writeFileSync(cli.outputPath, json);
    console.error(`Report written to ${cli.outputPath}`);
  } else {
    console.log(json);
  }

  console.error(
    `\nEval: ${report.summary.passed}/${report.summary.total} passed (${(report.summary.pass_rate * 100).toFixed(1)}%) | schema_validity=${(report.quality_gates.schema_validity.value * 100).toFixed(1)}%`,
  );

  if (shouldExitWithFailure(report, cli)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
