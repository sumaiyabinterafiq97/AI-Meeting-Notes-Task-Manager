import { embeddingService } from '../../embeddings/services/embedding.service';
import { rankingService } from '../../retrievers/services/ranking.service';
import type { RetrievedChunk } from '../../retrievers/types/retriever.types';
import { contextBuilderService } from '../context-builders/context-builder.service';
import { promptBuilderService } from '../prompt-builders/prompt-builder.service';
import { hybridRetriever } from '../retrievers/hybrid.retriever';
import { ragFallbackService } from './rag-fallback.service';
import { ragObservabilityService } from './rag-observability.service';
import { ragCacheService } from './rag-cache.service';
import type {
  RAGBuildOptions,
  RAGContext,
  RAGPipelineExecutionResult,
  RAGPipelineStage,
  RAGPipelineStageMetric,
  RAGQuery,
} from '../types/rag.types';

function stageMetric(
  stage: RAGPipelineStage,
  startedAt: number,
  success: boolean,
  error?: string,
): RAGPipelineStageMetric {
  return {
    stage,
    latencyMs: Date.now() - startedAt,
    success,
    error,
  };
}

function toRetrievedChunks(
  chunks: Array<{
    id: string;
    content: string;
    meetingId?: string;
    sourceType: string;
    similarity: number;
    metadata: Record<string, unknown>;
  }>,
): RetrievedChunk[] {
  return chunks.map((chunk) => ({
    id: chunk.id,
    content: chunk.content,
    meetingId: chunk.meetingId,
    sourceType: chunk.sourceType,
    similarity: chunk.similarity,
    metadata: chunk.metadata,
  }));
}

/**
 * Staged RAG pipeline: Query → Embed → Vector Search → Filter → Rank → Context → Prompt.
 * @see docs/rag-architecture.md §1
 */
export class RAGPipelineService {
  async execute(
    query: RAGQuery,
    history: Array<{ role: string; content: string }> = [],
    options?: RAGBuildOptions,
  ): Promise<RAGPipelineExecutionResult> {
    const pipelineStartedAt = Date.now();
    const stages: RAGPipelineStageMetric[] = [];
    const maxRetries = options?.maxRetries ?? 1;
    let retries = 0;
    let degraded = false;

    const queryStageStart = Date.now();
    const mode = query.mode ?? 'hybrid';
    const topK = query.topK ?? 10;
    const minSimilarity = query.similarityMin ?? 0.65;
    stages.push(stageMetric('query', queryStageStart, true));

    let retrieval = await this.runRetrieval(query, stages, maxRetries, (attempt) => {
      retries = attempt;
    });

    if (retrieval.chunks.length === 0 && mode !== 'keyword') {
      degraded = true;
      retrieval = await ragFallbackService.keywordFallback(query);
      stages.push(stageMetric('vector_search', Date.now(), false, 'empty_results_keyword_fallback'));
    }

    const filterStart = Date.now();
    let filtered = toRetrievedChunks(retrieval.chunks);
    const applyCosineThreshold =
      mode === 'semantic' ||
      (retrieval.retrievalMode === 'semantic' && mode !== 'hybrid');
    if (applyCosineThreshold) {
      filtered = rankingService.applyThreshold(filtered, minSimilarity);
    }
    filtered = rankingService.deduplicateBySource(filtered);
    stages.push(stageMetric('filter', filterStart, true));

    const rankStart = Date.now();
    const ranked = rankingService.rankBySimilarity(filtered).slice(0, topK);
    stages.push(stageMetric('rank', rankStart, true));

    const contextStart = Date.now();
    const useCase = options?.useCase ?? (query.meetingId ? 'meeting' : 'chat');
    const contextHash = ragCacheService.buildContextHash(
      ranked.map((chunk) => chunk.id),
      query.query,
    );
    const cachedContext = await ragCacheService.getContext<RAGContext>(
      query.workspaceId,
      contextHash,
    );
    const context =
      cachedContext ??
      (useCase === 'weekly'
        ? contextBuilderService.buildForWeeklyReport(ranked, options?.tokenBudget)
        : useCase === 'meeting'
          ? contextBuilderService.buildForMeeting(ranked, options?.tokenBudget)
          : contextBuilderService.buildForChat(ranked, options?.tokenBudget));

    if (!cachedContext) {
      await ragCacheService.setContext(query.workspaceId, contextHash, context);
    }
    stages.push(stageMetric('context', contextStart, true));

    ragObservabilityService.recordContextBuild({
      workspaceId: query.workspaceId,
      chunkCount: context.chunksIncluded,
      contextTokens: context.totalTokens,
      useCase,
      chunksDropped: context.chunksDropped,
    });

    const promptStart = Date.now();
    const promptId = options?.promptId ?? 'chat-agent';
    const prompt = promptBuilderService.build(
      promptId,
      context.blocks,
      history,
      query.query,
      options?.variables,
    );
    stages.push(stageMetric('prompt', promptStart, true));

    ragObservabilityService.recordPipeline({
      workspaceId: query.workspaceId,
      mode,
      degraded,
      retries,
      stageCount: stages.length,
      totalLatencyMs: Date.now() - pipelineStartedAt,
      chunkCount: ranked.length,
      contextTokens: context.totalTokens,
    });
    ragObservabilityService.recordCacheSummary(query.workspaceId);

    return {
      context,
      prompt,
      retrieval,
      stages,
      degraded,
      retries,
    };
  }

  private async runRetrieval(
    query: RAGQuery,
    stages: RAGPipelineStageMetric[],
    maxRetries: number,
    onRetry: (attempt: number) => void,
  ) {
    const embedStart = Date.now();
    let embedSuccess = true;
    let embedError: string | undefined;

    if (query.mode !== 'keyword') {
      try {
        await embeddingService.generateBatch([query.query], query.workspaceId);
      } catch (error) {
        embedSuccess = false;
        embedError = error instanceof Error ? error.message : 'embed_failed';
      }
    }
    stages.push(stageMetric('embed', embedStart, embedSuccess, embedError));

    const searchStart = Date.now();
    let attempt = 0;
    let lastError: string | undefined;

    while (attempt <= maxRetries) {
      try {
        const { chunks, cacheHit, retrievalMode } = await hybridRetriever.retrieve(query);
        stages.push(stageMetric('vector_search', searchStart, true));
        return {
          chunks: chunks.map((chunk) => ({
            id: chunk.id,
            content: chunk.content,
            meetingId: chunk.meetingId,
            sourceType: chunk.sourceType,
            similarity: chunk.similarity,
            metadata: chunk.metadata,
          })),
          cacheHit,
          retrievalMode,
          latencyMs: Date.now() - searchStart,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'search_failed';
        attempt += 1;
        onRetry(attempt);
        if (attempt > maxRetries) break;
      }
    }

    stages.push(stageMetric('vector_search', searchStart, false, lastError));
    return ragFallbackService.keywordFallback(query);
  }
}

export const ragPipelineService = new RAGPipelineService();
