import { env } from '../../../config/env';
import { llmService } from '../../llm';
import type { EmbeddingRequest, EmbeddingResult } from '../types/embedding.types';

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

    const batchSize = DEFAULT_BATCH_SIZE;
    const embeddings: number[][] = [];
    let totalTokens = 0;
    let resolvedModel = model ?? env.EMBEDDING_MODEL;

    for (let offset = 0; offset < texts.length; offset += batchSize) {
      const batch = texts.slice(offset, offset + batchSize);
      const response = await llmService.embed({
        texts: batch,
        model: resolvedModel,
        workspaceId: workspaceId || undefined,
      });

      embeddings.push(...response.embeddings);
      totalTokens += response.totalTokens;
      resolvedModel = response.model;
    }

    return {
      embeddings,
      model: resolvedModel,
      dimensions: embeddings[0]?.length ?? DEFAULT_DIMENSIONS,
      totalTokens,
    };
  }
}

export const embeddingService = new EmbeddingService();
