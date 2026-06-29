import { hashChunkContent } from '../../../src/modules/embeddings/lib/content-hash';
import { chunkingStrategyRegistry } from '../../../src/modules/chunking/strategies/strategy-registry';

describe('content-hash', () => {
  it('produces stable SHA-256 hashes', () => {
    const hash1 = hashChunkContent('Hello world');
    const hash2 = hashChunkContent('Hello world');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('trims whitespace before hashing', () => {
    expect(hashChunkContent('  text  ')).toBe(hashChunkContent('text'));
  });
});

describe('ChunkingStrategyRegistry', () => {
  it('uses recursive strategy for transcripts by default', () => {
    const longText = Array.from({ length: 50 }, (_, i) => `Paragraph ${i}. ${'word '.repeat(80)}`).join('\n\n');
    const chunks = chunkingStrategyRegistry.chunk({
      content: longText,
      sourceType: 'transcript',
      sourceId: 'src-1',
    });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.metadata.chunkingStrategy).toBe('recursive');
  });

  it('uses single strategy for decisions', () => {
    const chunks = chunkingStrategyRegistry.chunk({
      content: 'We decided to ship in April.',
      sourceType: 'decision',
      sourceId: 'src-2',
    });
    expect(chunks).toHaveLength(1);
  });

  it('uses semantic strategy for knowledge', () => {
    const chunks = chunkingStrategyRegistry.chunk({
      content: 'Section A\n\nDetails about auth.\n\nSection B\n\nMore details.',
      sourceType: 'knowledge',
      sourceId: 'src-3',
    });
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0]?.metadata.chunkingStrategy).toBe('semantic');
  });
});
