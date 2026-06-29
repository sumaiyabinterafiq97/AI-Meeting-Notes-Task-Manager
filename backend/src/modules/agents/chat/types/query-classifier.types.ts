import type { DocumentSourceType } from '../../../vector/types/vector.types';
import type { RAGSearchMode } from '../../../rag/types/rag.types';

export type ChatQueryIntent =
  | 'factual_lookup'
  | 'synthesis'
  | 'comparison'
  | 'task_query'
  | 'meeting_query'
  | 'general';

export type QueryClassificationMethod = 'rules' | 'llm';

export interface QueryRetrievalHints {
  sourceTypes?: DocumentSourceType[];
  topK?: number;
  mode?: RAGSearchMode;
}

export interface QueryClassificationResult {
  intent: ChatQueryIntent;
  confidence: number;
  method: QueryClassificationMethod;
  retrievalHints: QueryRetrievalHints;
}
