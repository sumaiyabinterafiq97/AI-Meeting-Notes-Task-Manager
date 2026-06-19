import { estimateTokens } from '../../../lib/token-estimate';
import type { ContextBlock, RAGContext } from '../types/rag.types';
import type { RetrievedChunk } from '../../retrievers/types/retriever.types';
import { tokenBudgetService, RAG_TOKEN_BUDGETS } from '../services/token-budget.service';

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

export class ContextBuilderService {
  build(
    chunks: RetrievedChunk[],
    tokenBudget = RAG_TOKEN_BUDGETS.retrievedContext,
  ): RAGContext {
    const deduped = this.deduplicateChunks(chunks);
    const sorted = [...deduped].sort((a, b) => b.similarity - a.similarity);
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

  private deduplicateChunks(chunks: RetrievedChunk[]): RetrievedChunk[] {
    const seen = new Set<string>();
    const result: RetrievedChunk[] = [];

    for (const chunk of chunks) {
      const key = `${chunk.meetingId ?? 'none'}:${chunk.sourceType}:${chunk.content.slice(0, 120)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(chunk);
    }

    return result;
  }
}

export const contextBuilderService = new ContextBuilderService();
