import { validateWithZod } from '../../../src/modules/llm/services/zod-validator.service';
import { SummarizerOutputSchemaV20 } from '../../../src/modules/agents/schemas/zod-schemas';
import { LLMValidationError } from '../../../src/modules/llm/errors/llm.errors';

describe('zod validator', () => {
  it('parses and validates valid JSON', () => {
    const content = JSON.stringify({
      summary: 'Meeting recap',
      keyTopics: ['Planning'],
    });
    const result = validateWithZod(SummarizerOutputSchemaV20, content);
    expect(result.summary).toBe('Meeting recap');
  });

  it('throws on invalid JSON', () => {
    expect(() => validateWithZod(SummarizerOutputSchemaV20, 'not json')).toThrow(LLMValidationError);
  });

  it('throws on schema mismatch', () => {
    const content = JSON.stringify({ summary: 123, keyTopics: [] });
    expect(() => validateWithZod(SummarizerOutputSchemaV20, content)).toThrow(LLMValidationError);
  });
});
