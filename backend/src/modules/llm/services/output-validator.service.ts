import { LLMValidationError } from '../errors/llm.errors';
import type { LLMCompletionRequest, LLMCompletionResponse } from '../types/llm.types';
import type { ILLMProvider } from '../interfaces/llm-provider.interface';
import { validateWithZod } from './zod-validator.service';
import type { z } from 'zod';

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    throw new LLMValidationError('LLM response is not valid JSON');
  }
}

export function validateStructuredOutput(content: string, schema?: z.ZodType): void {
  const parsed = parseJson(content);
  if (schema) {
    validateWithZod(schema, content);
    return;
  }
  if (parsed === null || typeof parsed !== 'object') {
    throw new LLMValidationError('LLM response must be a JSON object');
  }
}

export async function completeWithJsonRepair(
  provider: ILLMProvider,
  request: LLMCompletionRequest,
  zodSchema?: z.ZodType,
): Promise<LLMCompletionResponse> {
  const response = await provider.complete(request);

  if (request.responseFormat !== 'json_schema') {
    return response;
  }

  try {
    validateStructuredOutput(response.content, zodSchema);
    return response;
  } catch {
    const repairRequest: LLMCompletionRequest = {
      ...request,
      messages: [
        ...request.messages,
        { role: 'assistant', content: response.content },
        {
          role: 'user',
          content:
            'Your previous response was invalid JSON or failed schema validation. Return only valid JSON matching the required schema with no markdown fences.',
        },
      ],
      responseFormat: 'json_schema',
    };

    const repaired = await provider.complete(repairRequest);
    validateStructuredOutput(repaired.content, zodSchema);
    return {
      ...repaired,
      promptTokens: response.promptTokens + repaired.promptTokens,
      completionTokens: response.completionTokens + repaired.completionTokens,
    };
  }
}
