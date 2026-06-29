import type { RetrievedChunk } from '../types/retriever.types';

const DEFAULT_MIN_SIMILARITY = 0.65;

export class RankingService {
  applyThreshold(chunks: RetrievedChunk[], minSimilarity = DEFAULT_MIN_SIMILARITY): RetrievedChunk[] {
    return chunks.filter((chunk) => chunk.similarity >= minSimilarity);
  }

  deduplicateBySource(chunks: RetrievedChunk[]): RetrievedChunk[] {
    const seen = new Set<string>();
    const result: RetrievedChunk[] = [];

    for (const chunk of chunks) {
      const key = chunk.sourceId
        ? `${chunk.meetingId ?? 'none'}:${chunk.sourceType}:${chunk.sourceId}:${chunk.chunkIndex ?? 0}`
        : chunk.id;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(chunk);
    }

    return result;
  }

  rankBySimilarity(chunks: RetrievedChunk[]): RetrievedChunk[] {
    return [...chunks].sort((a, b) => b.similarity - a.similarity);
  }
}

export const rankingService = new RankingService();
