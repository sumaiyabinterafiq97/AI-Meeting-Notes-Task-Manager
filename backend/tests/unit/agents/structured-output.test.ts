import { llmService } from '../../../src/modules/llm';
import {
  buildStructuredCompletionRequest,
  completeStructured,
  parseStructuredOutput,
} from '../../../src/modules/agents/schemas/structured-output.service';
import { ChatResponseSchema } from '../../../src/modules/agents/schemas/zod-schemas';

describe('structured output service', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds json_schema completion requests', () => {
    const request = buildStructuredCompletionRequest('chat', {
      workflow: 'chat',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(request.responseFormat).toBe('json_schema');
    expect(request.jsonSchema).toMatchObject({
      name: expect.any(String),
      strict: true,
      schema: expect.any(Object),
    });
  });

  it('parses structured chat output with zod', () => {
    const parsed = parseStructuredOutput(
      'chat',
      JSON.stringify({
        content: 'Answer [CITATION-1]',
        citations: [{ index: 1, chunkId: 'chunk-1' }],
        grounded: true,
        refusalReason: null,
      }),
      ChatResponseSchema,
    );

    expect(parsed.content).toContain('Answer');
    expect(parsed.citations).toHaveLength(1);
  });

  it('delegates to llmService.completeStructured with repair support', async () => {
    jest.spyOn(llmService, 'completeStructured').mockResolvedValue({
      content: JSON.stringify({
        content: 'Structured answer [CITATION-1]',
        citations: [{ index: 1, chunkId: 'chunk-1' }],
        grounded: true,
        refusalReason: null,
      }),
      model: 'mock',
      provider: 'mock',
      promptTokens: 10,
      completionTokens: 5,
      finishReason: 'stop',
      parsed: {
        content: 'Structured answer [CITATION-1]',
        citations: [{ index: 1, chunkId: 'chunk-1' }],
        grounded: true,
        refusalReason: null,
      },
    });

    const result = await completeStructured(
      'chat',
      {
        workflow: 'chat',
        messages: [{ role: 'user', content: 'What was decided?' }],
      },
      { zodSchema: ChatResponseSchema },
    );

    expect(result.parsed.grounded).toBe(true);
    expect(llmService.completeStructured).toHaveBeenCalled();
  });
});
