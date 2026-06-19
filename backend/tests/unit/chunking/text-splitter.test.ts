import { splitTextIntoChunks } from '../../../src/modules/chunking/lib/text-splitter';
import { estimateTokens } from '../../../src/lib/token-estimate';

describe('splitTextIntoChunks', () => {
  it('splits long transcript into multiple chunks', () => {
    const paragraph = 'This is a sentence about planning. '.repeat(80);
    const text = `${paragraph}\n\n${paragraph}`;

    const chunks = splitTextIntoChunks(text, { targetTokens: 100, overlapTokens: 10 });
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => {
      expect(estimateTokens(chunk)).toBeLessThanOrEqual(140);
    });
  });

  it('returns a single chunk for short text', () => {
    const chunks = splitTextIntoChunks('Short meeting note.');
    expect(chunks).toEqual(['Short meeting note.']);
  });
});

describe('estimateTokens', () => {
  it('estimates roughly one token per four characters', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('a'.repeat(40))).toBe(10);
  });
});
