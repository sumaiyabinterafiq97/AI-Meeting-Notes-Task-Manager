import { Document } from '@langchain/core/documents';
import { RunnableLambda } from '@langchain/core/runnables';
import type { ChunkInput, TextChunk, ChunkingOptions } from '../types/chunk.types';
import { splitTextIntoChunks } from '../lib/text-splitter';
import { estimateTokens } from '../../../lib/token-estimate';

/**
 * LangChain Runnable bridge for recursive text splitting.
 * @see modules/llm/langchain/langchain-bridge.ts
 */
export const langChainRecursiveSplitter = RunnableLambda.from(
  (input: { chunkInput: ChunkInput; options?: ChunkingOptions }): TextChunk[] => {
    const parts = splitTextIntoChunks(input.chunkInput.content, {
      targetTokens: input.options?.targetTokens ?? 512,
      overlapTokens: input.options?.overlapTokens ?? 64,
    });

    return parts.map((content, chunkIndex) => ({
      content,
      chunkIndex,
      tokenCount: estimateTokens(content),
      sourceType: input.chunkInput.sourceType,
      sourceId: input.chunkInput.sourceId,
      metadata: {
        ...input.chunkInput.metadata,
        meetingId: input.chunkInput.meetingId,
        chunkingStrategy: 'langchain-recursive',
      },
    }));
  },
);

export function toLangChainDocuments(chunks: TextChunk[]): Document[] {
  return chunks.map(
    (chunk) =>
      new Document({
        pageContent: chunk.content,
        metadata: {
          sourceType: chunk.sourceType,
          sourceId: chunk.sourceId,
          chunkIndex: chunk.chunkIndex,
          ...chunk.metadata,
        },
      }),
  );
}
