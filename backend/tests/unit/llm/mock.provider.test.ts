import { MockLLMProvider } from '../../../src/modules/llm/providers/mock.provider';
import { buildMockEmbedding } from '../../../src/modules/llm/fixtures/mock-responses';

describe('MockLLMProvider', () => {
  const provider = new MockLLMProvider();

  it('returns structured meeting analysis JSON', async () => {
    const response = await provider.complete({
      workflow: 'process-meeting',
      responseFormat: 'json_schema',
      messages: [
        { role: 'user', content: 'Meeting title: Sprint Planning\n\nTranscript:\nAlice: ship Friday' },
      ],
    });

    const parsed = JSON.parse(response.content) as { summary: string; actionItems: unknown[] };
    expect(parsed.summary).toContain('Sprint Planning');
    expect(parsed.actionItems.length).toBeGreaterThan(0);
    expect(response.provider).toBe('mock');
  });

  it('streams completion chunks', async () => {
    const chunks: string[] = [];
    for await (const chunk of provider.completeStream({
      workflow: 'chat',
      messages: [{ role: 'user', content: 'Hello' }],
    })) {
      if (!chunk.done) chunks.push(chunk.content);
    }
    expect(chunks.join('').length).toBeGreaterThan(0);
  });

  it('generates normalized 1536-dim embeddings', async () => {
    const response = await provider.embed({ texts: ['hello world', 'hello world'] });
    expect(response.embeddings).toHaveLength(2);
    expect(response.embeddings[0]).toHaveLength(1536);
    expect(response.embeddings[0]).toEqual(response.embeddings[1]);

    const magnitude = Math.sqrt(
      response.embeddings[0].reduce((sum, value) => sum + value * value, 0),
    );
    expect(magnitude).toBeCloseTo(1, 5);
  });

  it('passes health check', async () => {
    await expect(provider.healthCheck()).resolves.toBe(true);
  });
});

describe('buildMockEmbedding', () => {
  it('is deterministic per input', () => {
    const a = buildMockEmbedding('test-input');
    const b = buildMockEmbedding('test-input');
    const c = buildMockEmbedding('other-input');
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});
