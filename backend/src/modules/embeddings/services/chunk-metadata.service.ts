import { hashChunkContent } from '../lib/content-hash';
import type { TextChunk } from '../../chunking/types/chunk.types';

export interface ChunkStorageMetadata extends Record<string, unknown> {
  contentHash: string;
  tokenCount: number;
  chunkingStrategy?: string;
  meetingTitle?: string;
  meetingDate?: string;
}

/**
 * Attaches embedding-tracked metadata to chunks before vector storage.
 */
export class ChunkMetadataService {
  enrich(chunk: TextChunk, extras?: Record<string, unknown>): ChunkStorageMetadata {
    return {
      ...chunk.metadata,
      ...extras,
      contentHash: hashChunkContent(chunk.content),
      tokenCount: chunk.tokenCount,
    };
  }

  extractContentHash(metadata: Record<string, unknown>): string | undefined {
    return typeof metadata.contentHash === 'string' ? metadata.contentHash : undefined;
  }
}

export const chunkMetadataService = new ChunkMetadataService();
