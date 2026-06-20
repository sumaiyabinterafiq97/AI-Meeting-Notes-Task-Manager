export type {
  KnowledgeInput,
  KnowledgeOutput,
  KnowledgeEntryResult,
  KnowledgeSourceRef,
  KnowledgeEntityKind,
  KnowledgeValidationResult,
} from './types/knowledge.types';
export { toPrismaKnowledgeEntityType } from './types/knowledge.types';
export {
  knowledgeAgent,
  buildKnowledgeMessage,
  buildKnowledgeCorrelationId,
} from './services/knowledge.service';
export {
  enrichKnowledgeOutput,
  validateKnowledgeOutput,
  extractKnowledgeEvidence,
  deduplicateKnowledgeEntries,
  normalizeEntityType,
  resolveSourceRef,
  stripKnowledgeForMerge,
  buildEmptyTranscriptKnowledgeOutput,
} from './services/knowledge.validator';
export {
  KNOWLEDGE_CONFIDENCE_THRESHOLD,
  MAX_KNOWLEDGE_ENTRIES,
  FALLBACK_KNOWLEDGE_OUTPUT,
} from './services/knowledge.constants';
