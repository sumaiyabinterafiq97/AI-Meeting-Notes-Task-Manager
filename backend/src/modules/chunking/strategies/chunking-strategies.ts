import type { ChunkInput, TextChunk, ChunkingOptions } from '../types/chunk.types';
import { splitTextIntoChunks } from '../lib/text-splitter';
import { estimateTokens } from '../../../lib/token-estimate';

export interface ChunkingStrategy {
  readonly name: string;
  chunk(input: ChunkInput, options?: ChunkingOptions): TextChunk[];
}

function toTextChunks(
  input: ChunkInput,
  parts: string[],
  strategyName: string,
): TextChunk[] {
  return parts.map((content, chunkIndex) => ({
    content,
    chunkIndex,
    tokenCount: estimateTokens(content),
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    metadata: {
      ...input.metadata,
      meetingId: input.meetingId,
      chunkingStrategy: strategyName,
    },
  }));
}

/** Fixed-size token windows with overlap (FR-RAG-CHUNK-001). */
export class FixedSizeChunkingStrategy implements ChunkingStrategy {
  readonly name = 'fixed';

  chunk(input: ChunkInput, options?: ChunkingOptions): TextChunk[] {
    const parts = splitTextIntoChunks(input.content, {
      targetTokens: options?.targetTokens ?? 256,
      overlapTokens: options?.overlapTokens ?? 32,
    });
    return toTextChunks(input, parts, this.name);
  }
}

/** Recursive paragraph → sentence → character split (default for transcripts). */
export class RecursiveChunkingStrategy implements ChunkingStrategy {
  readonly name = 'recursive';

  chunk(input: ChunkInput, options?: ChunkingOptions): TextChunk[] {
    const parts = splitTextIntoChunks(input.content, {
      targetTokens: options?.targetTokens ?? 512,
      overlapTokens: options?.overlapTokens ?? 64,
    });
    return toTextChunks(input, parts, this.name);
  }
}

/** Sliding window with configurable stride (overlap = target - stride). */
export class SlidingWindowChunkingStrategy implements ChunkingStrategy {
  readonly name = 'sliding';

  chunk(input: ChunkInput, options?: ChunkingOptions): TextChunk[] {
    const targetTokens = options?.targetTokens ?? 512;
    const overlapTokens = options?.overlapTokens ?? 128;
    const parts = splitTextIntoChunks(input.content, { targetTokens, overlapTokens });
    return toTextChunks(input, parts, this.name);
  }
}

/** Semantic boundaries — paragraph-first split for knowledge documents. */
export class SemanticChunkingStrategy implements ChunkingStrategy {
  readonly name = 'semantic';

  chunk(input: ChunkInput, options?: ChunkingOptions): TextChunk[] {
    const paragraphs = input.content
      .replace(/\r\n/g, '\n')
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    const targetTokens = options?.targetTokens ?? 256;
    const merged: string[] = [];
    let buffer = '';

    for (const paragraph of paragraphs) {
      const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
      if (estimateTokens(candidate) <= targetTokens) {
        buffer = candidate;
      } else {
        if (buffer) merged.push(buffer);
        buffer = estimateTokens(paragraph) <= targetTokens ? paragraph : paragraph.slice(0, targetTokens * 4);
      }
    }
    if (buffer) merged.push(buffer);

    return toTextChunks(input, merged.length > 0 ? merged : [input.content.trim()], this.name);
  }
}

export const fixedSizeChunkingStrategy = new FixedSizeChunkingStrategy();
export const recursiveChunkingStrategy = new RecursiveChunkingStrategy();
export const slidingWindowChunkingStrategy = new SlidingWindowChunkingStrategy();
export const semanticChunkingStrategy = new SemanticChunkingStrategy();
