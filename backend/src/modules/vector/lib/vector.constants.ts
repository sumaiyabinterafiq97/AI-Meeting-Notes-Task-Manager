/** Similarity thresholds by use case — @see docs/vector-db-design.md §4.3 */
export const SIMILARITY_THRESHOLDS = {
  chat: 0.7,
  search: 0.65,
  knowledgeDedup: 0.92,
  weeklyReport: 0.6,
} as const;

export const DEFAULT_TOP_K = 20;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const RRF_K = 60;
export const EMBEDDING_DIMENSIONS = 1536;

/** Weighted fusion — @see docs/rag-requirements.md §9.1 */
export const HYBRID_SEMANTIC_WEIGHT = 0.7;
export const HYBRID_KEYWORD_WEIGHT = 0.3;
