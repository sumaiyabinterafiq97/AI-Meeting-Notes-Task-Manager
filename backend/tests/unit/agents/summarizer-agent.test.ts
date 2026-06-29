import { SummarizerOutputSchemaV20 } from '../../../src/modules/agents/schemas/zod-schemas';
import { validateWithZod } from '../../../src/modules/llm/services/zod-validator.service';
import { buildMockSummarizerOutput } from '../../../src/modules/llm/fixtures/mock-responses';

describe('summarizer agent output', () => {
  it('mock provider output passes Zod validation', () => {
    const mock = buildMockSummarizerOutput('Meeting title: Sprint Planning');
    const validated = SummarizerOutputSchemaV20.parse(mock);
    expect(validated.summary).toContain('Sprint Planning');
    expect(validated.keyTopics.length).toBeGreaterThan(0);
  });

  it('rejects malformed summarizer JSON via validator', () => {
    expect(() =>
      validateWithZod(SummarizerOutputSchemaV20, JSON.stringify({ summary: 'Only summary' })),
    ).toThrow();
  });
});
