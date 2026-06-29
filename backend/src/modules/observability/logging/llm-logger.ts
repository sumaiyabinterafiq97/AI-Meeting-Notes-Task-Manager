import { structuredLogger, logStructured } from './structured-logger';

/** @deprecated Prefer structuredLogger */
export const llmLogger = structuredLogger.child({ component: 'llm' });

export type { StructuredLogFields } from './structured-logger';

export interface LLMLogContext {
  correlationId?: string;
  workspaceId?: string;
  userId?: string;
  workflow?: string;
  provider?: string;
  model?: string;
  requestId?: string;
  tokens?: number;
  latencyMs?: number;
  cost?: number;
  retries?: number;
}

export function logLLMInvocation(context: LLMLogContext, message: string): void {
  logStructured('info', { ...context, component: 'llm', action: 'invocation.completed' }, message);
}

export function logLLMError(context: LLMLogContext, error: Error): void {
  logStructured(
    'error',
    { ...context, component: 'llm', action: 'invocation.failed', err: error.message },
    'LLM invocation failed',
  );
}
