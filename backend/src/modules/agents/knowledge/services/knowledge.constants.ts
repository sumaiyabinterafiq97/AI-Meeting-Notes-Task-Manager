import type { KnowledgeEntityKind } from '../types/knowledge.types';

export const KNOWLEDGE_CONFIDENCE_THRESHOLD = 0.5;
export const MAX_KNOWLEDGE_ENTRIES = 10;
export const KNOWLEDGE_TITLE_MAX_LENGTH = 300;
export const KNOWLEDGE_CONTENT_MAX_LENGTH = 2000;
export const KNOWLEDGE_EVIDENCE_LENGTH = 300;
export const KNOWLEDGE_TRANSCRIPT_EXCERPT_LENGTH = 12_000;

export const VALID_KNOWLEDGE_ENTITY_TYPES: readonly KnowledgeEntityKind[] = [
  'definition',
  'process',
  'agreement',
  'technical',
  'people',
  'other',
] as const;

export const FALLBACK_KNOWLEDGE_OUTPUT = {
  entries: [] as never[],
  filteredCount: 0,
  averageConfidence: 0,
};

export const EMPTY_TRANSCRIPT_KNOWLEDGE_OUTPUT = {
  entries: [] as never[],
  filteredCount: 0,
  averageConfidence: 1,
};

/** Transient or speculative language — used to warn on possible false positives. */
export const WEAK_KNOWLEDGE_PATTERNS = [
  /\btodo\b/i,
  /\baction item\b/i,
  /\bnext meeting\b/i,
  /\bstandup\b/i,
  /\bmight\b/i,
  /\bmaybe\b/i,
  /\bbrainstorm/i,
  /\bjust an idea\b/i,
] as const;
