import { estimateTokens } from '../../../../lib/token-estimate';
import type { RetrievedChunk } from '../../../retrievers/types/retriever.types';

/**
 * Compresses chunk content when approaching token budget — keeps lead sentences.
 */
export class ContextCompressionService {
  compressChunk(content: string, maxTokens: number): string {
    if (estimateTokens(content) <= maxTokens) {
      return content;
    }

    const sentences = content.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length <= 1) {
      return content.slice(0, maxTokens * 4).trim();
    }

    let compressed = '';
    for (const sentence of sentences) {
      const candidate = compressed ? `${compressed} ${sentence}` : sentence;
      if (estimateTokens(candidate) > maxTokens) break;
      compressed = candidate;
    }

    return compressed || sentences[0]!;
  }

  compressLowestPriority(chunks: RetrievedChunk[], overflowTokens: number): RetrievedChunk[] {
    if (overflowTokens <= 0 || chunks.length === 0) return chunks;

    const sorted = [...chunks].sort((a, b) => a.similarity - b.similarity);
    let saved = 0;
    const toCompress = new Set<string>();

    for (const chunk of sorted) {
      if (saved >= overflowTokens) break;
      toCompress.add(chunk.id);
      saved += Math.ceil(estimateTokens(chunk.content) * 0.3);
    }

    return chunks.map((chunk) => {
      if (!toCompress.has(chunk.id)) return chunk;
      const target = Math.max(32, estimateTokens(chunk.content) - Math.ceil(overflowTokens / toCompress.size));
      return {
        ...chunk,
        content: this.compressChunk(chunk.content, target),
        metadata: { ...chunk.metadata, compressed: true },
      };
    });
  }
}

export const contextCompressionService = new ContextCompressionService();
