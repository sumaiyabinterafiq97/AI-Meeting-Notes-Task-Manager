import type { LLMProviderId, LLMWorkflow } from '../types/llm.types';
import type { ModelInfo } from '../types/llm.types';

export const WORKFLOW_DEFAULT_MODEL: Record<LLMWorkflow, string> = {
  'process-meeting': 'gpt-4o',
  summarizer: 'gpt-4o',
  'task-extractor': 'gpt-4o',
  decision: 'gpt-4o',
  'risk-analyzer': 'gpt-4o',
  chat: 'gpt-4o-mini',
  embed: 'text-embedding-3-small',
  'weekly-report': 'gpt-4o',
  'knowledge-extract': 'gpt-4o',
};

export const MODEL_CATALOG: Record<string, ModelInfo> = {
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    maxContextTokens: 128_000,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    provider: 'openai',
    maxContextTokens: 128_000,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  'text-embedding-3-small': {
    id: 'text-embedding-3-small',
    provider: 'openai',
    maxContextTokens: 8_192,
    supportsStreaming: false,
    supportsEmbeddings: true,
  },
  'gemini-2.5-flash-lite': {
    id: 'gemini-2.5-flash-lite',
    provider: 'google',
    maxContextTokens: 1_000_000,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    provider: 'google',
    maxContextTokens: 1_000_000,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    provider: 'google',
    maxContextTokens: 1_000_000,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  'gemini-2.0-flash-lite': {
    id: 'gemini-2.0-flash-lite',
    provider: 'google',
    maxContextTokens: 1_000_000,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash',
    provider: 'google',
    maxContextTokens: 1_000_000,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    provider: 'google',
    maxContextTokens: 2_000_000,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  'text-embedding-004': {
    id: 'text-embedding-004',
    provider: 'google',
    maxContextTokens: 2_048,
    supportsStreaming: false,
    supportsEmbeddings: true,
  },
  'claude-3-5-sonnet-latest': {
    id: 'claude-3-5-sonnet-latest',
    provider: 'anthropic',
    maxContextTokens: 200_000,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  'claude-3-5-haiku-latest': {
    id: 'claude-3-5-haiku-latest',
    provider: 'anthropic',
    maxContextTokens: 200_000,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  mock: {
    id: 'mock',
    provider: 'mock',
    maxContextTokens: 128_000,
    supportsStreaming: true,
    supportsEmbeddings: true,
  },
};

export function getDefaultModelForProvider(
  providerId: LLMProviderId,
  workflow: LLMWorkflow,
): string {
  const workflowDefault = WORKFLOW_DEFAULT_MODEL[workflow];

  if (providerId === 'mock') return 'mock';
  if (providerId === 'openai') return workflowDefault;
  if (providerId === 'google') {
    return workflow === 'embed' ? 'text-embedding-004' : 'gemini-2.5-flash-lite';
  }
  if (providerId === 'anthropic') {
    return workflow === 'process-meeting' ||
      workflow === 'weekly-report' ||
      workflow === 'decision' ||
      workflow === 'risk-analyzer'
      ? 'claude-3-5-sonnet-latest'
      : 'claude-3-5-haiku-latest';
  }
  if (providerId === 'local') return 'llama3';

  return workflowDefault;
}

export function resolveModelInfo(modelId: string, providerId: LLMProviderId): ModelInfo {
  return (
    MODEL_CATALOG[modelId] ?? {
      id: modelId,
      provider: providerId,
      maxContextTokens: 32_000,
      supportsStreaming: true,
      supportsEmbeddings: false,
    }
  );
}
