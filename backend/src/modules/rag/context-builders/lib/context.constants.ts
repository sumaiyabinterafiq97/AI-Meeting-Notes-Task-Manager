import type { RAGContextUseCase } from '../../types/rag.types';

/** Token reserve per citation block header (speaker, meeting line). */
export const CONTEXT_HEADER_TOKEN_RESERVE = 50;

export const CONTEXT_USE_CASE_LABELS: Record<RAGContextUseCase, string> = {
  chat: 'Workspace Chat',
  meeting: 'Meeting Chat',
  weekly: 'Weekly Report',
};

export const MIN_CONTEXT_CHUNKS = 1;
