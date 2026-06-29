import type {
  RAGBuildOptions,
  RAGContext,
  RAGPipelineExecutionResult,
  RAGPipelineResult,
  RAGQuery,
  RAGSearchResult,
} from '../types/rag.types';
import { hybridRetriever } from '../retrievers/hybrid.retriever';
import { contextBuilderService } from '../context-builders/context-builder.service';
import { ragObservabilityService } from './rag-observability.service';
import { ragPipelineService } from './rag-pipeline.service';

export type { RAGBuildOptions };

/**
 * RAG service — retrieval, context construction, prompt assembly.
 * @see docs/rag-architecture.md
 */
export class RAGService {
  async retrieve(query: RAGQuery) {
    const startedAt = Date.now();
    const { chunks, cacheHit, retrievalMode } = await hybridRetriever.retrieve(query);
    return {
      chunks,
      cacheHit,
      retrievalMode,
      latencyMs: Date.now() - startedAt,
    };
  }

  async buildContext(
    query: RAGQuery,
    options?: Pick<RAGBuildOptions, 'useCase' | 'tokenBudget'>,
  ): Promise<RAGContext> {
    const { chunks } = await this.retrieve(query);
    const useCase = options?.useCase ?? (query.meetingId ? 'meeting' : 'chat');
    const context =
      useCase === 'weekly'
        ? contextBuilderService.buildForWeeklyReport(chunks, options?.tokenBudget)
        : useCase === 'meeting'
          ? contextBuilderService.buildForMeeting(chunks, options?.tokenBudget)
          : contextBuilderService.buildForChat(chunks, options?.tokenBudget);

    ragObservabilityService.recordContextBuild({
      workspaceId: query.workspaceId,
      chunkCount: context.chunksIncluded,
      contextTokens: context.totalTokens,
      useCase,
      chunksDropped: context.chunksDropped,
    });
    return context;
  }

  async search(query: RAGQuery): Promise<RAGSearchResult> {
    const startedAt = Date.now();
    const { chunks, cacheHit, retrievalMode } = await hybridRetriever.retrieve(query);

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
      latencyMs: Date.now() - startedAt,
    };
  }

  async executePipeline(
    query: RAGQuery,
    history: Array<{ role: string; content: string }> = [],
    options?: RAGBuildOptions,
  ): Promise<RAGPipelineExecutionResult> {
    return ragPipelineService.execute(query, history, options);
  }

  async prepareChatPrompt(
    query: RAGQuery,
    history: Array<{ role: string; content: string }> = [],
    options?: RAGBuildOptions,
  ): Promise<RAGPipelineResult> {
    const result = await ragPipelineService.execute(query, history, options);
    return {
      context: result.context,
      prompt: result.prompt,
      retrieval: result.retrieval,
    };
  }
}

export const ragService = new RAGService();
