import { estimateTokens } from '../../../lib/token-estimate';
import type { ContextBlock, RAGContext, RAGContextUseCase } from '../types/rag.types';
import type { RetrievedChunk } from '../../retrievers/types/retriever.types';
import { tokenBudgetService, resolveContextTokenBudget } from '../services/token-budget.service';

function formatContextBlock(block: ContextBlock): string {
  const meetingLine = block.meetingTitle
    ? `Meeting: ${block.meetingTitle}${block.metadata.meetingDate ? ` (${block.metadata.meetingDate})` : ''}`
    : 'Meeting: Unknown';

  const speaker =
    typeof block.metadata.speaker === 'string' ? `Speaker: ${block.metadata.speaker}` : null;
  const timestamp =
    typeof block.metadata.timestamp_start === 'string'
      ? `Time: ${block.metadata.timestamp_start}`
      : null;
  const metaLine = [speaker, timestamp].filter(Boolean).join(' | ');

  return [
    `[CITATION-${block.citationIndex}] ${meetingLine}`,
    metaLine,
    `"${block.content.trim()}"`,
  ]
    .filter(Boolean)
    .join('\n');
}

function parseChronologyKey(chunk: RetrievedChunk): number {
  const meetingDate =
    typeof chunk.metadata.meetingDate === 'string' ? Date.parse(chunk.metadata.meetingDate) : NaN;
  if (!Number.isNaN(meetingDate)) {
    return meetingDate;
  }

  const timestamp =
    typeof chunk.metadata.timestamp_start === 'string'
      ? parseTimestamp(chunk.metadata.timestamp_start)
      : 0;

  return timestamp;
}

function parseTimestamp(value: string): number {
  const parts = value.split(':').map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) {
    return 0;
  }

  if (parts.length === 3) {
    return parts[0] * 3_600_000 + parts[1] * 60_000 + parts[2] * 1_000;
  }

  if (parts.length === 2) {
    return parts[0] * 60_000 + parts[1] * 1_000;
  }

  return 0;
}

export class ContextBuilderService {
  build(
    chunks: RetrievedChunk[],
    options?: { tokenBudget?: number; useCase?: RAGContextUseCase },
  ): RAGContext {
    const tokenBudget =
      options?.tokenBudget ?? resolveContextTokenBudget(options?.useCase);
    const deduped = this.deduplicateChunks(chunks);
    const sorted = this.sortChunks(deduped);
    const trimmed = tokenBudgetService.trimChunks(sorted, tokenBudget);

    const blocks: ContextBlock[] = trimmed.map((chunk, index) => ({
      citationIndex: index + 1,
      chunkId: chunk.id,
      content: chunk.content,
      meetingId: chunk.meetingId,
      meetingTitle:
        typeof chunk.metadata.meetingTitle === 'string'
          ? chunk.metadata.meetingTitle
          : undefined,
      metadata: chunk.metadata,
    }));

    const totalTokens = blocks.reduce(
      (sum, block) => sum + estimateTokens(formatContextBlock(block)),
      0,
    );

    return { blocks, totalTokens };
  }

  formatBlocks(blocks: ContextBlock[]): string {
    return blocks.map(formatContextBlock).join('\n\n');
  }

  private sortChunks(chunks: RetrievedChunk[]): RetrievedChunk[] {
    return [...chunks].sort((a, b) => {
      const similarityDelta = b.similarity - a.similarity;
      if (Math.abs(similarityDelta) > 0.05) {
        return similarityDelta;
      }

      const chronologyDelta = parseChronologyKey(a) - parseChronologyKey(b);
      if (chronologyDelta !== 0) {
        return chronologyDelta;
      }

      const chunkIndexDelta = (a.chunkIndex ?? 0) - (b.chunkIndex ?? 0);
      if (chunkIndexDelta !== 0) {
        return chunkIndexDelta;
      }

      return a.id.localeCompare(b.id);
    });
  }

  private deduplicateChunks(chunks: RetrievedChunk[]): RetrievedChunk[] {
    const seen = new Set<string>();
    const result: RetrievedChunk[] = [];

    for (const chunk of chunks) {
      const key =
        chunk.sourceId !== undefined
          ? `${chunk.meetingId ?? 'none'}:${chunk.sourceType}:${chunk.sourceId}:${chunk.chunkIndex ?? 0}`
          : `${chunk.meetingId ?? 'none'}:${chunk.sourceType}:${chunk.content.slice(0, 120)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(chunk);
    }

    return result;
  }
}

export const contextBuilderService = new ContextBuilderService();
