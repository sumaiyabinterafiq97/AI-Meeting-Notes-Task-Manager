import { embeddingService } from '../../embeddings/services/embedding.service';
import type { DocumentChunk, HybridSearchQuery } from '../types/vector.types';
import { vectorRepository } from '../repositories/vector.repository';
import { reciprocalRankFusion } from './rrf.service';

const DEFAULT_TOP_K = 20;
const SEMANTIC_MIN_SIMILARITY = 0.65;

export class VectorService {
  async hybridSearch(query: HybridSearchQuery): Promise<DocumentChunk[]> {
    const topK = query.topK ?? DEFAULT_TOP_K;

    if (query.mode === 'keyword') {
      return vectorRepository.keywordSearch({ ...query, topK });
    }

    if (query.mode === 'semantic') {
      const semantic = await this.semanticSearch(query);
      if (semantic.length > 0) {
        return semantic;
      }
      return vectorRepository.keywordSearch({ ...query, topK });
    }

    const [semantic, keyword] = await Promise.all([
      this.semanticSearch({ ...query, topK: Math.max(topK, 50) }),
      vectorRepository.keywordSearch({ ...query, topK: Math.max(topK, 50) }),
    ]);

    if (semantic.length === 0 && keyword.length > 0) {
      return keyword.slice(0, topK);
    }

    if (semantic.length === 0 && keyword.length === 0) {
      return [];
    }

    const fused = reciprocalRankFusion(
      [semantic, keyword],
      (chunk) => chunk.id,
      60,
    );

    return fused.slice(0, topK).map((entry) => ({
      ...entry.item,
      similarity: entry.score,
    }));
  }

  async semanticSearch(query: HybridSearchQuery): Promise<DocumentChunk[]> {
    try {
      const embedResult = await embeddingService.generateBatch(
        [query.query],
        query.workspaceId,
      );

      const queryVector = embedResult.embeddings[0] ?? [];
      if (queryVector.length === 0) {
        return [];
      }

      return vectorRepository.similaritySearch({
        workspaceId: query.workspaceId,
        queryVector,
        meetingId: query.meetingId,
        sourceTypes: query.sourceTypes,
        topK: query.topK ?? DEFAULT_TOP_K,
        minSimilarity: SEMANTIC_MIN_SIMILARITY,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      });
    } catch {
      return [];
    }
  }

  async similaritySearch(query: HybridSearchQuery): Promise<DocumentChunk[]> {
    return this.semanticSearch(query);
  }
}

export const vectorService = new VectorService();
