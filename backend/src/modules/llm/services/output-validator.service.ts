import { LLMValidationError } from '../errors/llm.errors';
import type { LLMCompletionRequest, LLMCompletionResponse } from '../types/llm.types';
import type { ILLMProvider } from '../interfaces/llm-provider.interface';

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    throw new LLMValidationError('LLM response is not valid JSON');
  }
}

export function validateStructuredOutput(content: string): void {
  parseJson(content);
}

export async function completeWithJsonRepair(
  provider: ILLMProvider,
  request: LLMCompletionRequest,
): Promise<LLMCompletionResponse> {
  const response = await provider.complete(request);

  if (request.responseFormat !== 'json_schema') {
    return response;
  }

  try {
    validateStructuredOutput(response.content);
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
            'Your previous response was invalid JSON. Return only valid JSON matching the required schema with no markdown fences.',
        },
      ],
      responseFormat: 'json_schema',
    };

    const repaired = await provider.complete(repairRequest);
    validateStructuredOutput(repaired.content);
    return {
      ...repaired,
      promptTokens: response.promptTokens + repaired.promptTokens,
      completionTokens: response.completionTokens + repaired.completionTokens,
    };
  }
}
