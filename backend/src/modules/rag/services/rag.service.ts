import type { RAGContext, RAGPipelineResult, RAGQuery, RAGSearchResult } from '../types/rag.types';
import { hybridRetriever } from '../retrievers/hybrid.retriever';
import { contextBuilderService } from '../context-builders/context-builder.service';
import { promptBuilderService } from '../prompt-builders/prompt-builder.service';

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

  async buildContext(query: RAGQuery): Promise<RAGContext> {
    const { chunks } = await this.retrieve(query);
    return contextBuilderService.build(chunks);
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
    promptId = 'chat-agent',
  ): Promise<RAGPipelineResult> {
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
    );

    const prompt = promptBuilderService.build(promptId, context.blocks, history, query.query);

    return {
      context,
      prompt,
      retrieval,
    };
  }
}

export const ragService = new RAGService();
