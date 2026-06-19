import { llmService } from '../../llm';
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
      return this.semanticSearch(query);
    }

    const [semantic, keyword] = await Promise.all([
      this.semanticSearch({ ...query, topK: Math.max(topK, 50) }),
      vectorRepository.keywordSearch({ ...query, topK: Math.max(topK, 50) }),
    ]);

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
    const embedResult = await llmService.embed({
      texts: [query.query],
      workspaceId: query.workspaceId,
    });

    const queryVector = embedResult.embeddings[0] ?? [];

    return vectorRepository.similaritySearch({
      workspaceId: query.workspaceId,
      queryVector,
      meetingId: query.meetingId,
      sourceTypes: query.sourceTypes,
      topK: query.topK ?? DEFAULT_TOP_K,
      minSimilarity: SEMANTIC_MIN_SIMILARITY,
    });
  }

  async similaritySearch(query: HybridSearchQuery): Promise<DocumentChunk[]> {
    return this.semanticSearch(query);
  }
}

export const vectorService = new VectorService();
