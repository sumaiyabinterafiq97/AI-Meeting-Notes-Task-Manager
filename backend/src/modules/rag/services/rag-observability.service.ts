import { llmLogger } from '../../observability/logging/llm-logger';
import { latencyTrackerService } from '../../observability/latency/latency-tracker.service';
import { metricsService, METRIC_NAMES } from '../../observability';
import type { RAGSearchResult } from '../types/rag.types';
import { ragCacheObservabilityService } from './rag-cache-observability.service';

export type RetrievalMode = 'hybrid' | 'semantic' | 'keyword' | 'keyword_only';

export interface RAGRetrievalMetrics {
  workspaceId: string;
  queryHash: string;
  mode: string;
  retrievalMode: RetrievalMode;
  cacheHit: boolean;
  chunkCount: number;
  avgSimilarity: number;
  latencyMs: number;
  embeddingLatencyMs?: number;
  searchLatencyMs?: number;
  contextTokens?: number;
  failures?: string[];
  retries?: number;
}

export class RAGObservabilityService {
  recordRetrieval(metrics: RAGRetrievalMetrics): void {
    latencyTrackerService.record(
      'rag.retrieval',
      metrics.latencyMs,
      { workspaceId: metrics.workspaceId, namespace: metrics.mode },
      'retrieval',
    );
    if (metrics.embeddingLatencyMs !== undefined) {
      latencyTrackerService.record(
        'rag.query_embed',
        metrics.embeddingLatencyMs,
        { workspaceId: metrics.workspaceId },
        'embedding',
      );
    }
    metricsService.recordLatency(METRIC_NAMES.RETRIEVAL_TIME, metrics.latencyMs, {
      workspaceId: metrics.workspaceId,
    });

    llmLogger.info(
      {
        event: 'rag.retrieval',
        workspaceId: metrics.workspaceId,
        queryHash: metrics.queryHash,
        mode: metrics.mode,
        retrievalMode: metrics.retrievalMode,
        cacheHit: metrics.cacheHit,
        chunkCount: metrics.chunkCount,
        avgSimilarity: Number(metrics.avgSimilarity.toFixed(3)),
        latencyMs: metrics.latencyMs,
        embeddingLatencyMs: metrics.embeddingLatencyMs,
        searchLatencyMs: metrics.searchLatencyMs,
        failures: metrics.failures,
        retries: metrics.retries ?? 0,
        cacheHitRate: Number(ragCacheObservabilityService.getSnapshot().hitRate.toFixed(3)),
      },
      'RAG retrieval completed',
    );
  }

  recordContextBuild(metrics: {
    workspaceId?: string;
    chunkCount: number;
    contextTokens: number;
    useCase?: string;
    chunksDropped?: number;
  }): void {
    llmLogger.info(
      {
        event: 'rag.context_built',
        workspaceId: metrics.workspaceId,
        chunkCount: metrics.chunkCount,
        contextTokens: metrics.contextTokens,
        useCase: metrics.useCase,
        chunksDropped: metrics.chunksDropped ?? 0,
      },
      'RAG context built',
    );
  }

  recordPipeline(metrics: {
    workspaceId: string;
    mode: string;
    degraded: boolean;
    retries: number;
    stageCount: number;
    totalLatencyMs: number;
    chunkCount: number;
    contextTokens: number;
  }): void {
    llmLogger.info(
      {
        event: 'rag.pipeline',
        workspaceId: metrics.workspaceId,
        mode: metrics.mode,
        degraded: metrics.degraded,
        retries: metrics.retries,
        stageCount: metrics.stageCount,
        totalLatencyMs: metrics.totalLatencyMs,
        chunkCount: metrics.chunkCount,
        contextTokens: metrics.contextTokens,
      },
      'RAG pipeline completed',
    );
  }

  summarizeSearchResult(result: RAGSearchResult): number {
    if (result.chunks.length === 0) return 0;
    return result.chunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / result.chunks.length;
  }

  recordCacheSummary(workspaceId?: string): void {
    const snapshot = ragCacheObservabilityService.getSnapshot();
    const alert = ragCacheObservabilityService.checkHitRateAlert();

    llmLogger.info(
      {
        event: 'rag.cache_summary',
        workspaceId,
        hits: snapshot.hits,
        misses: snapshot.misses,
        hitRate: Number(snapshot.hitRate.toFixed(3)),
        byNamespace: snapshot.byNamespace,
        alert,
      },
      'RAG cache summary',
    );
  }
}

export const ragObservabilityService = new RAGObservabilityService();
