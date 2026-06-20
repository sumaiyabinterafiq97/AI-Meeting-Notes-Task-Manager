import type { z } from 'zod';
import { LLMValidationError } from '../../llm/errors/llm.errors';

export function validateWithZod<T>(schema: z.ZodType<T>, content: string): T {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new LLMValidationError('LLM response is not valid JSON');
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new LLMValidationError(`Schema validation failed: ${issues}`);
  }

  return result.data;
}

export function validateParsedWithZod<T>(schema: z.ZodType<T>, parsed: unknown): T {
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new LLMValidationError(`Schema validation failed: ${issues}`);
  }
  return result.data;
}
