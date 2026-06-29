import { createHash } from 'crypto';

/** SHA-256 content hash for skip-if-unchanged embedding (FR-RAG-EMB-005). */
export function hashChunkContent(content: string): string {
  return createHash('sha256').update(content.trim()).digest('hex');
}
