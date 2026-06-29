import { randomUUID } from 'crypto';
import { llmService } from '../modules/llm';
import { promptRegistry } from '../modules/prompts/services/prompt-registry.service';
import { resolveJsonSchema, resolveZodSchema } from '../modules/agents/schemas/schema-resolver';
import { validateWithZod } from '../modules/llm/services/zod-validator.service';
import { buildEmptyTranscriptOutput } from '../modules/agents/summarizer/services/summarizer.validator';
import { buildEmptyTranscriptTaskOutput } from '../modules/agents/task-extractor/services/task-extractor.validator';
import { buildEmptyTranscriptDecisionOutput } from '../modules/agents/decision/services/decision.validator';
import { buildEmptyTranscriptRiskOutput } from '../modules/agents/risk-analyzer/services/risk-analyzer.validator';
import { buildEmptyTranscriptKnowledgeOutput } from '../modules/agents/knowledge/services/knowledge.validator';
import { buildLowActivityWeeklyReportOutput } from '../modules/agents/weekly-report/services/weekly-report.validator';
import type { SuiteConfig } from './suite-config';
import {
  buildTemplateVariables,
  buildUserContent,
  isEmptyTranscript,
  wrapUserContent,
} from './user-content-builder';
import type { EvalCase } from './types';

const EVAL_WORKSPACE_ID = undefined;

export interface ExecutionResult {
  output: unknown;
  rawText: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  model: string;
  provider: string;
}

function emptyOutputForSuite(suite: SuiteConfig): unknown {
  switch (suite.schemaKey) {
    case 'summarizer':
      return buildEmptyTranscriptOutput();
    case 'task-extractor':
      return buildEmptyTranscriptTaskOutput();
    case 'decision':
      return buildEmptyTranscriptDecisionOutput();
    case 'risk-analyzer':
      return buildEmptyTranscriptRiskOutput();
    case 'knowledge':
      return buildEmptyTranscriptKnowledgeOutput();
    case 'weekly-report':
      return buildLowActivityWeeklyReportOutput({
        workspaceName: 'Workspace',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-07',
        meetingCount: 0,
        meetingSummaries: '',
        openRisks: '',
        taskStats: { created: 0, completed: 0, open: 0, overdue: 0 },
      });
    default:
      return null;
  }
}

export async function executeEvalCase(
  suite: SuiteConfig,
  evalCase: EvalCase,
): Promise<ExecutionResult> {
  const startedAt = Date.now();
  const input = evalCase.input;

  if (
    suite.outputType === 'json' &&
    isEmptyTranscript(input) &&
    ['summarizer', 'task-extractor', 'decision', 'risk-analyzer', 'knowledge'].includes(suite.schemaKey)
  ) {
    return {
      output: emptyOutputForSuite(suite),
      rawText: JSON.stringify(emptyOutputForSuite(suite)),
      latencyMs: Date.now() - startedAt,
      promptTokens: 0,
      completionTokens: 0,
      model: 'none',
      provider: 'none',
    };
  }

  if (suite.schemaKey === 'weekly-report' && Number(input.meetingCount ?? 0) === 0) {
    const output = buildLowActivityWeeklyReportOutput({
      workspaceName: String(input.workspaceName ?? 'Workspace'),
      dateFrom: String(input.dateFrom ?? '2026-01-01'),
      dateTo: String(input.dateTo ?? '2026-01-07'),
      meetingCount: 0,
      meetingSummaries: '',
      openRisks: '',
      taskStats: { created: 0, completed: 0, open: 0, overdue: 0 },
    });
    return {
      output,
      rawText: JSON.stringify(output),
      latencyMs: Date.now() - startedAt,
      promptTokens: 0,
      completionTokens: 0,
      model: 'none',
      provider: 'none',
    };
  }

  const variables = buildTemplateVariables(suite, input);
  const rendered = promptRegistry.render(suite.promptId, { variables });
  const systemContent =
    rendered?.messages[0]?.content ??
    'You are a meeting analysis agent. Return valid JSON only matching the required schema.';

  const userContent = wrapUserContent(buildUserContent(suite, input));
  const messages = [
    { role: 'system' as const, content: systemContent },
    { role: 'user' as const, content: userContent },
  ];

  const correlationId = randomUUID();
  const jsonSchema = resolveJsonSchema(suite.schemaKey);

  const response = await llmService.complete(
    {
      workflow: suite.workflow,
      messages,
      responseFormat: suite.outputType === 'json' ? 'json_schema' : 'text',
      jsonSchema: suite.outputType === 'json' ? jsonSchema : undefined,
      workspaceId: EVAL_WORKSPACE_ID,
      correlationId,
    },
    {
      promptId: suite.promptId,
      promptVersion: rendered?.version ?? '0.0.0',
    },
  );

  let output: unknown = response.content;
  if (suite.outputType === 'json') {
    try {
      validateWithZod(resolveZodSchema(suite.schemaKey), response.content);
      output = JSON.parse(response.content);
    } catch {
      output = null;
    }
  }

  return {
    output,
    rawText: response.content,
    latencyMs: Date.now() - startedAt,
    promptTokens: response.promptTokens,
    completionTokens: response.completionTokens,
    model: response.model,
    provider: response.provider,
  };
}
