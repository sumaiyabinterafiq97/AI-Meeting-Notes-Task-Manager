import type { RAGContext, RAGContextUseCase, RAGPipelineResult, RAGQuery, RAGSearchResult } from '../types/rag.types';
import { hybridRetriever } from '../retrievers/hybrid.retriever';
import { contextBuilderService } from '../context-builders/context-builder.service';
import { promptBuilderService } from '../prompt-builders/prompt-builder.service';

export interface RAGBuildOptions {
  promptId?: string;
  variables?: Record<string, string>;
  useCase?: RAGContextUseCase;
  tokenBudget?: number;
}

/**
 * RAG service — retrieval, context construction, prompt assembly.
 * @see docs/rag-architecture.md
 */
export class RAGService {
  async retrieve(query: RAGQuery) {
    const startedAt = Date.now();
    const { chunks, cacheHit } = await hybridRetriever.retrieve(query);
    return {
      chunks,
      cacheHit,
      latencyMs: Date.now() - startedAt,
    };
  }

  async buildContext(
    query: RAGQuery,
    options?: Pick<RAGBuildOptions, 'useCase' | 'tokenBudget'>,
  ): Promise<RAGContext> {
    const { chunks } = await this.retrieve(query);
    return contextBuilderService.build(chunks, options);
  }

  async search(query: RAGQuery): Promise<RAGSearchResult> {
    const startedAt = Date.now();
    const { chunks, cacheHit } = await hybridRetriever.retrieve(query);

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
      latencyMs: Date.now() - startedAt,
    };
  }

  async prepareChatPrompt(
    query: RAGQuery,
    history: Array<{ role: string; content: string }> = [],
    options?: RAGBuildOptions,
  ): Promise<RAGPipelineResult> {
    const promptId = options?.promptId ?? 'chat-agent';
    const retrieval = await this.search(query);
    const context = contextBuilderService.build(
      retrieval.chunks.map((chunk) => ({
        id: chunk.id,
        content: chunk.content,
        meetingId: chunk.meetingId,
        sourceType: chunk.sourceType,
        similarity: chunk.similarity,
        metadata: chunk.metadata,
      })),
      {
        useCase: options?.useCase ?? (query.meetingId ? 'meeting' : 'chat'),
        tokenBudget: options?.tokenBudget,
      },
    );

    const prompt = promptBuilderService.build(
      promptId,
      context.blocks,
      history,
      query.query,
      options?.variables,
    );

    return {
      context,
      prompt,
      retrieval,
    };
  }
}

export const ragService = new RAGService();
