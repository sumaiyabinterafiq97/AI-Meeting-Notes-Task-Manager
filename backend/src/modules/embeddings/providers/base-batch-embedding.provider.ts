import { env } from '../../../config/env';
import { embeddingCacheService } from '../services/embedding-cache.service';
import { embeddingValidatorService } from '../services/embedding-validator.service';
import {
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_BATCH_SIZE,
  EMBEDDING_DIMENSIONS,
} from '../lib/embedding.constants';
import type { EmbeddingRequest, EmbeddingResult } from '../types/embedding.types';
import type { IEmbeddingProvider } from './embedding-provider.interface';

export interface ProviderEmbedResponse {
  embeddings: number[][];
  model: string;
  totalTokens: number;
}

/**
 * Shared batch embedding with cache, validation, and retries.
 * Provider-specific logic only implements `callProvider`.
 */
export abstract class BaseBatchEmbeddingProvider implements IEmbeddingProvider {
  abstract readonly id: string;

  protected abstract callProvider(
    texts: string[],
    model: string,
    workspaceId?: string,
  ): Promise<ProviderEmbedResponse>;

  async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
    if (request.texts.length === 0) {
      return this.emptyResult(request.model);
    }

    const resolvedModel = request.model ?? DEFAULT_EMBEDDING_MODEL;
    const embeddings: number[][] = new Array(request.texts.length);
    let totalTokens = 0;
    let cacheHits = 0;
    let retries = 0;

    for (let offset = 0; offset < request.texts.length; offset += EMBEDDING_BATCH_SIZE) {
      const batch = request.texts.slice(offset, offset + EMBEDDING_BATCH_SIZE);
      const cached = await embeddingCacheService.getMany(batch, resolvedModel);

      const uncachedIndices: number[] = [];
      const uncachedTexts: string[] = [];

      cached.forEach((vector, index) => {
        const globalIndex = offset + index;
        if (vector && vector.length === EMBEDDING_DIMENSIONS) {
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

      const { texts: validTexts, originalIndices } =
        embeddingValidatorService.filterEmptyTexts(uncachedTexts);

      if (validTexts.length === 0) {
        continue;
      }

      const response = await this.callWithRetry(
        () => this.callProvider(validTexts, resolvedModel, request.workspaceId),
      );
      retries += response.retries;

      embeddingValidatorService.assertVectorDimensions(response.result.embeddings);

      const remapped = embeddingValidatorService.remapEmbeddings(
        uncachedTexts.length,
        originalIndices,
        response.result.embeddings,
      );

      uncachedIndices.forEach((globalIndex, batchIndex) => {
        embeddings[globalIndex] = remapped[batchIndex] ?? [];
      });

      validTexts.forEach((text, index) => {
        const vector = response.result.embeddings[index];
        if (vector) {
          void embeddingCacheService.set(text, resolvedModel, vector);
        }
      });

      totalTokens += response.result.totalTokens;
    }

    return {
      embeddings,
      model: resolvedModel,
      dimensions: embeddings.find((vector) => vector.length > 0)?.length ?? EMBEDDING_DIMENSIONS,
      totalTokens,
      cacheHits,
      cacheMisses: request.texts.length - cacheHits,
      retries,
    };
  }

  protected async callWithRetry(
    fn: () => Promise<ProviderEmbedResponse>,
  ): Promise<{ result: ProviderEmbedResponse; retries: number }> {
    const maxAttempts = env.LLM_MAX_RETRIES;
    let lastError: unknown;
    let retries = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await fn();
        return { result, retries };
      } catch (error) {
        lastError = error;
        retries = attempt - 1;
        if (attempt >= maxAttempts) break;
        await sleep(Math.min(1000 * 2 ** (attempt - 1), 8000));
      }
    }

    throw lastError;
  }

  protected emptyResult(model?: string): EmbeddingResult {
    return {
      embeddings: [],
      model: model ?? DEFAULT_EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      totalTokens: 0,
      cacheHits: 0,
      cacheMisses: 0,
      retries: 0,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
