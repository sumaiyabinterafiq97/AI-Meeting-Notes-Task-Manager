import pino from 'pino';
import { env } from '../../../config/env';

export const llmLogger = pino({
  name: 'meetingmind-llm',
  level: env.LOG_LEVEL ?? 'info',
  redact: ['apiKey', 'password', 'token', 'authorization'],
});

export interface LLMLogContext {
  correlationId?: string;
  workspaceId?: string;
  workflow?: string;
  provider?: string;
  model?: string;
}

export function logLLMInvocation(context: LLMLogContext, message: string): void {
  llmLogger.info(context, message);
}

export function logLLMError(context: LLMLogContext, error: Error): void {
  llmLogger.error({ ...context, err: error.message }, 'LLM invocation failed');
}
