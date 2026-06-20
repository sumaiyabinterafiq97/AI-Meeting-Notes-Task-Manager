import { env } from '../../../config/env';
import { llmService } from '../../llm';
import type { EmbeddingRequest, EmbeddingResult } from '../types/embedding.types';
import { embeddingCacheService } from './embedding-cache.service';

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_DIMENSIONS = 1536;

export class EmbeddingService {
  async generate(request: EmbeddingRequest): Promise<EmbeddingResult> {
    return this.generateBatch(request.texts, request.workspaceId ?? '', request.model);
  }

  async generateBatch(
    texts: string[],
    workspaceId: string,
    model?: string,
  ): Promise<EmbeddingResult> {
    if (texts.length === 0) {
      return {
        embeddings: [],
        model: model ?? env.EMBEDDING_MODEL,
        dimensions: DEFAULT_DIMENSIONS,
        totalTokens: 0,
      };
    }

    const resolvedModel = model ?? env.EMBEDDING_MODEL;
    const batchSize = DEFAULT_BATCH_SIZE;
    const embeddings: number[][] = new Array(texts.length);
    let totalTokens = 0;
    let cacheHits = 0;

    for (let offset = 0; offset < texts.length; offset += batchSize) {
      const batch = texts.slice(offset, offset + batchSize);
      const cached = await embeddingCacheService.getMany(batch, resolvedModel);

      const uncachedIndices: number[] = [];
      const uncachedTexts: string[] = [];

      cached.forEach((vector, index) => {
        const globalIndex = offset + index;
        if (vector) {
          embeddings[globalIndex] = vector;
          cacheHits += 1;
        } else {
          uncachedIndices.push(globalIndex);
          uncachedTexts.push(batch[index]!);
        }
      });

      if (uncachedTexts.length === 0) {
        continue;
      }

      const response = await llmService.embed({
        texts: uncachedTexts,
        model: resolvedModel,
        workspaceId: workspaceId || undefined,
      });

      uncachedIndices.forEach((globalIndex, index) => {
        embeddings[globalIndex] = response.embeddings[index] ?? [];
      });

      await embeddingCacheService.setMany(uncachedTexts, response.model, response.embeddings);
      totalTokens += response.totalTokens;
    }

    return {
      embeddings,
      model: resolvedModel,
      dimensions: embeddings.find((vector) => vector.length > 0)?.length ?? DEFAULT_DIMENSIONS,
      totalTokens,
      cacheHits,
      cacheMisses: texts.length - cacheHits,
    };
  }
}

export const embeddingService = new EmbeddingService();
