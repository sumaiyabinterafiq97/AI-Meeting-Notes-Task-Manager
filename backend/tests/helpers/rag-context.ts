import type { RAGContext, ContextBlock } from '../../src/modules/rag/types/rag.types';

/** Minimal RAGContext for unit tests — matches production shape after context builder. */
export function mockRagContext(
  overrides: Partial<RAGContext> & { blocks?: ContextBlock[] } = {},
): RAGContext {
  const blocks = overrides.blocks ?? [];
  const formattedContext =
    overrides.formattedContext ??
    blocks.map((b) => `[${b.citationIndex}] ${b.content}`).join('\n\n');

  return {
    blocks,
    formattedContext,
    citations:
      overrides.citations ??
      blocks.map((b) => ({
        index: b.citationIndex,
        chunkId: b.chunkId,
        meetingId: b.meetingId,
        meetingTitle: b.meetingTitle,
        excerpt: b.content.slice(0, 200),
      })),
    totalTokens: overrides.totalTokens ?? (blocks.length > 0 ? 20 : 0),
    tokenBudget: overrides.tokenBudget ?? 4000,
    chunksIncluded: overrides.chunksIncluded ?? blocks.length,
    chunksDropped: overrides.chunksDropped ?? 0,
    useCase: overrides.useCase,
  };
}
