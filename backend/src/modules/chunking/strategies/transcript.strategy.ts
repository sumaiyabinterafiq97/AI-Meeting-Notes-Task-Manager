import type { ChunkInput, TextChunk, ChunkingOptions } from '../types/chunk.types';
import { splitTextIntoChunks } from '../lib/text-splitter';
import { estimateTokens } from '../../../lib/token-estimate';

export interface ChunkingStrategy {
  readonly sourceType: string;
  chunk(input: ChunkInput, options?: ChunkingOptions): TextChunk[];
}

export class TranscriptChunkingStrategy implements ChunkingStrategy {
  readonly sourceType = 'transcript';

  chunk(input: ChunkInput, options?: ChunkingOptions): TextChunk[] {
    const parts = splitTextIntoChunks(input.content, {
      targetTokens: options?.targetTokens ?? 512,
      overlapTokens: options?.overlapTokens ?? 64,
    });

    return parts.map((content, chunkIndex) => ({
      content,
      chunkIndex,
      tokenCount: estimateTokens(content),
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      metadata: {
        ...input.metadata,
        meetingId: input.meetingId,
      },
    }));
  }
}

export const transcriptChunkingStrategy = new TranscriptChunkingStrategy();

export class SingleBlockChunkingStrategy implements ChunkingStrategy {
  readonly sourceType = 'single';

  chunk(input: ChunkInput): TextChunk[] {
    const content = input.content.trim();
    if (!content) return [];

    return [
      {
        content,
        chunkIndex: 0,
        tokenCount: estimateTokens(content),
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        metadata: {
          ...input.metadata,
          meetingId: input.meetingId,
        },
      },
    ];
  }
}

export const singleBlockChunkingStrategy = new SingleBlockChunkingStrategy();
