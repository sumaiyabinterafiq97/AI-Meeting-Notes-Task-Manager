import type { ChunkInput, TextChunk, ChunkingOptions } from '../types/chunk.types';
import type { ChunkResultDto } from '../dto/chunk.dto';
import { chunkBatchSchema } from '../schemas/chunk.schema';
import { stripVttToPlainText } from '../lib/vtt-parser';
import { chunkingStrategyRegistry } from '../strategies/strategy-registry';
import { chunkStatsService } from './chunk-stats.service';

/**
 * Chunking service — splits documents into embeddable chunks.
 * @see docs/embedding-flow.md
 */
export class ChunkingService {
  chunk(inputs: ChunkInput[], options?: ChunkingOptions): TextChunk[] {
    const validated = chunkBatchSchema.parse({ inputs, options });
    const chunks: TextChunk[] = [];
    const indexCounters = new Map<string, number>();

    for (const input of validated.inputs) {
      const normalized = this.normalizeInput(input);
      const key = `${normalized.sourceType}:${normalized.sourceId}`;
      const produced = chunkingStrategyRegistry.chunk(normalized, validated.options);

      for (const chunk of produced) {
        const chunkIndex = indexCounters.get(key) ?? 0;
        chunks.push({ ...chunk, chunkIndex });
        indexCounters.set(key, chunkIndex + 1);
      }
    }

    return chunks;
  }

  chunkWithStats(inputs: ChunkInput[], options?: ChunkingOptions): ChunkResultDto {
    const chunks = this.chunk(inputs, options);
    return chunkStatsService.buildResult(chunks);
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

  private normalizeInput(input: ChunkInput): ChunkInput {
    if (input.sourceType !== 'transcript') {
      return input;
    }

    const plainText = stripVttToPlainText(input.content);
    return {
      ...input,
      content: plainText,
      metadata: {
        ...input.metadata,
        originalFormat: input.content.includes('-->') ? 'vtt' : 'plain',
      },
    };
  }
}

export const chunkingService = new ChunkingService();
