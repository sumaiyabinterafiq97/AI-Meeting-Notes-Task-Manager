import { estimateTokens } from '../../../lib/token-estimate';

export interface SplitTextOptions {
  targetTokens?: number;
  overlapTokens?: number;
}

export function splitTextIntoChunks(
  text: string,
  options: SplitTextOptions = {},
): string[] {
  const targetTokens = options.targetTokens ?? 512;
  const overlapTokens = options.overlapTokens ?? 64;

  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  const flush = (): void => {
    if (current.trim()) {
      chunks.push(current.trim());
    }
    current = '';
  };

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (estimateTokens(candidate) <= targetTokens) {
      current = candidate;
      continue;
    }

    if (current) {
      flush();
    }

    if (estimateTokens(paragraph) <= targetTokens) {
      current = paragraph;
      continue;
    }

    const sentences = paragraph.split(/(?<=[.!?])\s+/);
    let sentenceBuffer = '';

    for (const sentence of sentences) {
      const next = sentenceBuffer ? `${sentenceBuffer} ${sentence}` : sentence;
      if (estimateTokens(next) <= targetTokens) {
        sentenceBuffer = next;
        continue;
      }

      if (sentenceBuffer) {
        chunks.push(sentenceBuffer.trim());
      }

      if (estimateTokens(sentence) <= targetTokens) {
        sentenceBuffer = sentence;
      } else {
        let offset = 0;
        const approxChars = targetTokens * 4;
        while (offset < sentence.length) {
          chunks.push(sentence.slice(offset, offset + approxChars).trim());
          offset += approxChars - overlapTokens * 4;
        }
        sentenceBuffer = '';
      }
    }

    if (sentenceBuffer) {
      current = sentenceBuffer;
    }
  }

  flush();

  if (chunks.length === 0 && normalized) {
    chunks.push(normalized);
  }

  return applyOverlap(chunks, overlapTokens);
}

function applyOverlap(chunks: string[], overlapTokens: number): string[] {
  if (chunks.length <= 1 || overlapTokens <= 0) {
    return chunks;
  }

  const overlapChars = overlapTokens * 4;
  const result: string[] = [chunks[0]];

  for (let i = 1; i < chunks.length; i++) {
    const previous = chunks[i - 1];
    const prefix = previous.slice(Math.max(0, previous.length - overlapChars));
    const merged = `${prefix}\n${chunks[i]}`.trim();
    result.push(merged);
  }

  return result;
}
