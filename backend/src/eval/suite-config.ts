import type { LLMWorkflow } from '../modules/llm/types/llm.types';
import type { AgentSchemaKey } from '../modules/agents/schemas/schema-resolver';

export interface SuiteConfig {
  manifestKey: string;
  fixtureFile: string;
  promptId: string;
  workflow: LLMWorkflow;
  schemaKey: AgentSchemaKey;
  outputType: 'json' | 'markdown';
}

export const SUITE_REGISTRY: Record<string, SuiteConfig> = {
  summarizer: {
    manifestKey: 'summarizer',
    fixtureFile: 'summarizer.yaml',
    promptId: 'summarizer',
    workflow: 'summarizer',
    schemaKey: 'summarizer',
    outputType: 'json',
  },
  'task-extractor': {
    manifestKey: 'task-extractor',
    fixtureFile: 'task-extractor.yaml',
    promptId: 'task-extractor',
    workflow: 'task-extractor',
    schemaKey: 'task-extractor',
    outputType: 'json',
  },
  'decision-agent': {
    manifestKey: 'decision-agent',
    fixtureFile: 'decision-agent.yaml',
    promptId: 'decision-agent',
    workflow: 'decision',
    schemaKey: 'decision',
    outputType: 'json',
  },
  'risk-analyzer': {
    manifestKey: 'risk-analyzer',
    fixtureFile: 'risk-analyzer.yaml',
    promptId: 'risk-analyzer',
    workflow: 'risk-analyzer',
    schemaKey: 'risk-analyzer',
    outputType: 'json',
  },
  'chat-agent': {
    manifestKey: 'chat-agent',
    fixtureFile: 'chat-agent.yaml',
    promptId: 'chat-agent',
    workflow: 'chat',
    schemaKey: 'chat',
    outputType: 'markdown',
  },
  'weekly-report': {
    manifestKey: 'weekly-report',
    fixtureFile: 'weekly-report.yaml',
    promptId: 'weekly-report',
    workflow: 'weekly-report',
    schemaKey: 'weekly-report',
    outputType: 'json',
  },
  'knowledge-agent': {
    manifestKey: 'knowledge-agent',
    fixtureFile: 'knowledge-agent.yaml',
    promptId: 'knowledge-agent',
    workflow: 'knowledge-extract',
    schemaKey: 'knowledge',
    outputType: 'json',
  },
};

export function resolveSuites(suiteArg: string): SuiteConfig[] {
  if (suiteArg === 'all') {
    return Object.values(SUITE_REGISTRY);
  }

  const config = SUITE_REGISTRY[suiteArg];
  if (!config) {
    const available = [...Object.keys(SUITE_REGISTRY), 'all'].join(', ');
    throw new Error(`Unknown suite "${suiteArg}". Available: ${available}`);
  }
  return [config];
}
