import pino from 'pino';
import { env } from '../../../config/env';
import { getObservabilityContext } from './log-context';

const REDACT_PATHS = [
  'apiKey',
  'password',
  'token',
  'authorization',
  'secret',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_API_KEY',
  'transcript',
  'messages',
  'content',
];

export const structuredLogger = pino({
  name: 'meetingmind',
  level: env.LOG_LEVEL ?? 'info',
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  mixin() {
    const ctx = getObservabilityContext();
    return {
      requestId: ctx.requestId,
      correlationId: ctx.correlationId,
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
    };
  },
});

export interface StructuredLogFields {
  requestId?: string;
  correlationId?: string;
  userId?: string;
  workspaceId?: string;
  model?: string;
  provider?: string;
  tokens?: number;
  latencyMs?: number;
  cost?: number;
  component?: string;
  action?: string;
  retries?: number;
  err?: string;
  [key: string]: unknown;
}

export function logStructured(
  level: 'info' | 'warn' | 'error' | 'debug',
  fields: StructuredLogFields,
  message: string,
): void {
  structuredLogger[level](fields, message);
}
