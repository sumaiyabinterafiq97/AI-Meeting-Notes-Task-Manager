import type { z } from 'zod';
import { env } from '../../../config/env';
import type { AgentType } from '../types/agent.types';
import {
  SUMMARIZER_OUTPUT_SCHEMA,
  TASK_EXTRACTOR_OUTPUT_SCHEMA,
  DECISION_OUTPUT_SCHEMA,
  RISK_ANALYZER_OUTPUT_SCHEMA,
  KNOWLEDGE_OUTPUT_SCHEMA,
  WEEKLY_REPORT_OUTPUT_SCHEMA,
  CHAT_RESPONSE_OUTPUT_SCHEMA,
} from './agent-schemas';
import {
  SUMMARIZER_OUTPUT_SCHEMA_V21,
  TASK_EXTRACTOR_OUTPUT_SCHEMA_V21,
  DECISION_OUTPUT_SCHEMA_V21,
  RISK_ANALYZER_OUTPUT_SCHEMA_V21,
  KNOWLEDGE_OUTPUT_SCHEMA_V21,
  WEEKLY_REPORT_OUTPUT_SCHEMA_V21,
  CHAT_RESPONSE_OUTPUT_SCHEMA_V21,
} from './v2.1-json-schemas';
import {
  SummarizerOutputSchemaV20,
  SummarizerOutputSchemaV21,
  TaskExtractorOutputSchemaV20,
  TaskExtractorOutputSchemaV21,
  DecisionOutputSchemaV20,
  DecisionOutputSchemaV21,
  RiskAnalyzerOutputSchemaV20,
  RiskAnalyzerOutputSchemaV21,
  WeeklyReportOutputSchemaV20,
  WeeklyReportOutputSchemaV21,
  KnowledgeOutputSchemaV20,
  KnowledgeOutputSchemaV21,
  ChatResponseSchema,
} from './zod-schemas';

export type AgentSchemaKey =
  | 'summarizer'
  | 'task-extractor'
  | 'decision'
  | 'risk-analyzer'
  | 'weekly-report'
  | 'knowledge'
  | 'chat';

export function isSchemaV21Enabled(): boolean {
  return env.PROMPT_SCHEMA_V2_1;
}

const JSON_SCHEMA_MAP_V20: Record<AgentSchemaKey, Record<string, unknown>> = {
  summarizer: SUMMARIZER_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
  'task-extractor': TASK_EXTRACTOR_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
  decision: DECISION_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
  'risk-analyzer': RISK_ANALYZER_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
  'weekly-report': WEEKLY_REPORT_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
  knowledge: KNOWLEDGE_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
  chat: CHAT_RESPONSE_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
};

const JSON_SCHEMA_MAP_V21: Record<AgentSchemaKey, Record<string, unknown>> = {
  summarizer: SUMMARIZER_OUTPUT_SCHEMA_V21 as unknown as Record<string, unknown>,
  'task-extractor': TASK_EXTRACTOR_OUTPUT_SCHEMA_V21 as unknown as Record<string, unknown>,
  decision: DECISION_OUTPUT_SCHEMA_V21 as unknown as Record<string, unknown>,
  'risk-analyzer': RISK_ANALYZER_OUTPUT_SCHEMA_V21 as unknown as Record<string, unknown>,
  'weekly-report': WEEKLY_REPORT_OUTPUT_SCHEMA_V21 as unknown as Record<string, unknown>,
  knowledge: KNOWLEDGE_OUTPUT_SCHEMA_V21 as unknown as Record<string, unknown>,
  chat: CHAT_RESPONSE_OUTPUT_SCHEMA_V21 as unknown as Record<string, unknown>,
};

const ZOD_SCHEMA_MAP_V20: Record<AgentSchemaKey, z.ZodType> = {
  summarizer: SummarizerOutputSchemaV20,
  'task-extractor': TaskExtractorOutputSchemaV20,
  decision: DecisionOutputSchemaV20,
  'risk-analyzer': RiskAnalyzerOutputSchemaV20,
  'weekly-report': WeeklyReportOutputSchemaV20,
  knowledge: KnowledgeOutputSchemaV20,
  chat: ChatResponseSchema,
};

const ZOD_SCHEMA_MAP_V21: Record<AgentSchemaKey, z.ZodType> = {
  summarizer: SummarizerOutputSchemaV21,
  'task-extractor': TaskExtractorOutputSchemaV21,
  decision: DecisionOutputSchemaV21,
  'risk-analyzer': RiskAnalyzerOutputSchemaV21,
  'weekly-report': WeeklyReportOutputSchemaV21,
  knowledge: KnowledgeOutputSchemaV21,
  chat: ChatResponseSchema,
};

export function resolveJsonSchema(agent: AgentSchemaKey): Record<string, unknown> {
  const useV21 = isSchemaV21Enabled();
  return useV21 ? JSON_SCHEMA_MAP_V21[agent] : JSON_SCHEMA_MAP_V20[agent];
}

export function resolveZodSchema(agent: AgentSchemaKey): z.ZodType {
  const useV21 = isSchemaV21Enabled();
  return useV21 ? ZOD_SCHEMA_MAP_V21[agent] : ZOD_SCHEMA_MAP_V20[agent];
}

export function agentTypeToSchemaKey(agentType: AgentType): AgentSchemaKey | null {
  const mapping: Partial<Record<AgentType, AgentSchemaKey>> = {
    summarizer: 'summarizer',
    'task-extractor': 'task-extractor',
    decision: 'decision',
    'risk-analyzer': 'risk-analyzer',
    'weekly-report': 'weekly-report',
    knowledge: 'knowledge',
    chat: 'chat',
  };
  return mapping[agentType] ?? null;
}
