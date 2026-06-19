import type { ChunkInput, TextChunk, ChunkingOptions } from '../types/chunk.types';
import {
  singleBlockChunkingStrategy,
  transcriptChunkingStrategy,
} from '../strategies/transcript.strategy';

/**
 * Chunking service — splits documents into embeddable chunks.
 * @see docs/embedding-flow.md
 */
export class ChunkingService {
  chunk(inputs: ChunkInput[], options?: ChunkingOptions): TextChunk[] {
    const chunks: TextChunk[] = [];
    const indexCounters = new Map<string, number>();

    for (const input of inputs) {
      const strategy =
        input.sourceType === 'transcript'
          ? transcriptChunkingStrategy
          : singleBlockChunkingStrategy;

      const key = `${input.sourceType}:${input.sourceId}`;
      const produced = strategy.chunk(input, options);

      for (const chunk of produced) {
        const chunkIndex = indexCounters.get(key) ?? 0;
        chunks.push({ ...chunk, chunkIndex });
        indexCounters.set(key, chunkIndex + 1);
      }
    }

    return chunks;
  }

  chunkTranscript(transcript: string, meetingId: string, sourceId: string): TextChunk[] {
    return this.chunk([
      {
        content: transcript,
        sourceType: 'transcript',
        sourceId,
        meetingId,
      },
    ]);
  }
}

export const chunkingService = new ChunkingService();
