import { env } from '../../../config/env';
import { embeddingProviderRegistry } from '../providers/embedding-provider.registry';
import { embeddingObservabilityService } from './embedding-observability.service';
import { embeddingRequestSchema } from '../schemas/embedding.schema';
import { estimateEmbeddingCostUsd, EMBEDDING_DIMENSIONS } from '../lib/embedding.constants';
import type { EmbeddingRequest, EmbeddingResult } from '../types/embedding.types';

function resolveProviderId(): string {
  return env.EMBEDDING_PROVIDER ?? 'openai';
}

export class EmbeddingService {
  async generate(request: EmbeddingRequest): Promise<EmbeddingResult> {
    embeddingRequestSchema.parse({
      texts: request.texts,
      model: request.model,
      workspaceId: request.workspaceId,
    });
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
        dimensions: EMBEDDING_DIMENSIONS,
        totalTokens: 0,
        cacheHits: 0,
        cacheMisses: 0,
        retries: 0,
      };
    }

    const providerId = resolveProviderId();
    const provider = embeddingProviderRegistry.getOrThrow(providerId);
    const startedAt = Date.now();

    try {
      const result = await provider.embed({
        texts,
        model: model as EmbeddingRequest['model'],
        workspaceId: workspaceId || undefined,
      });

      const latencyMs = Date.now() - startedAt;
      const estimatedCostUsd = estimateEmbeddingCostUsd(result.totalTokens);

      embeddingObservabilityService.record({
        workspaceId: workspaceId || undefined,
        provider: providerId,
        model: result.model,
        batchSize: texts.length,
        totalTokens: result.totalTokens,
        cacheHits: result.cacheHits ?? 0,
        cacheMisses: result.cacheMisses ?? texts.length,
        latencyMs,
        estimatedCostUsd,
        retries: result.retries ?? 0,
      });

      return {
        ...result,
        latencyMs,
        estimatedCostUsd,
      };
    } catch (error) {
      embeddingObservabilityService.recordFailure(error, {
        workspaceId: workspaceId || undefined,
        provider: providerId,
      });
      throw error;
    }
  }

  listProviders(): Array<{ id: string; available: boolean }> {
    return embeddingProviderRegistry.list().map((provider) => ({
      id: provider.id,
      available: true,
    }));
  }
}

export const embeddingService = new EmbeddingService();
