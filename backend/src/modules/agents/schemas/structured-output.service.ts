import type { z } from 'zod';
import { env } from '../../../config/env';
import { llmService, type LLMServiceOptions } from '../../llm/services/llm.service';
import type { LLMCompletionRequest, LLMCompletionResponse } from '../../llm/types/llm.types';
import { validateWithZod } from '../../llm/services/zod-validator.service';
import {
  type AgentSchemaKey,
  resolveJsonSchema,
  resolveZodSchema,
  isSchemaV21Enabled,
} from './schema-resolver';

export interface StructuredCompletionResult<T> {
  response: LLMCompletionResponse;
  parsed: T;
}

export function shouldUseStructuredChatOutput(): boolean {
  return isSchemaV21Enabled();
}

/** Tools + v2.1 structured chat: tool loop first, then structured final synthesis. */
export function shouldUseUnifiedChatMode(): boolean {
  return isSchemaV21Enabled() && env.CHAT_TOOLS_ENABLED;
}

export function buildStructuredCompletionRequest(
  schemaKey: AgentSchemaKey,
  base: Omit<LLMCompletionRequest, 'responseFormat' | 'jsonSchema'>,
): LLMCompletionRequest {
  return {
    ...base,
    responseFormat: 'json_schema',
    jsonSchema: resolveJsonSchema(schemaKey) as Record<string, unknown>,
  };
}

export function parseStructuredOutput<T>(
  schemaKey: AgentSchemaKey,
  content: string,
  zodSchema?: z.ZodType<T>,
): T {
  const schema = zodSchema ?? (resolveZodSchema(schemaKey) as z.ZodType<T>);
  return validateWithZod(schema, content);
}

export async function completeStructured<T>(
  schemaKey: AgentSchemaKey,
  request: Omit<LLMCompletionRequest, 'responseFormat' | 'jsonSchema'>,
  options: LLMServiceOptions & { zodSchema?: z.ZodType<T> } = {},
): Promise<StructuredCompletionResult<T>> {
  const structuredRequest = buildStructuredCompletionRequest(schemaKey, request);
  const zodSchema = options.zodSchema ?? (resolveZodSchema(schemaKey) as z.ZodType<T>);
  const response = await llmService.completeStructured(structuredRequest, {
    ...options,
    zodSchema,
  });

  return {
    response,
    parsed: response.parsed,
  };
}
