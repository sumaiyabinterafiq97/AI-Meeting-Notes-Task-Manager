export * from './types/vector.types';
export * from './types/hybrid-search.types';
export * from './dto/vector.dto';
export * from './dto/hybrid-search.dto';
export * from './schemas/vector.schema';
export { vectorRepository, VectorRepository } from './repositories/vector.repository';
export type { StoredChunkInput } from './repositories/vector.repository';
export { vectorService, VectorService } from './services/vector.service';
export { hybridSearchService, HybridSearchService } from './services/hybrid-search.service';
export { vectorStorageService, VectorStorageService } from './services/vector-storage.service';
export { filterValidatorService, RetrievalFilterValidationError } from './services/filter-validator.service';
export { reciprocalRankFusion } from './services/rrf.service';
export {
  SIMILARITY_THRESHOLDS,
  DEFAULT_TOP_K,
  DEFAULT_PAGE_SIZE,
  HYBRID_SEMANTIC_WEIGHT,
  HYBRID_KEYWORD_WEIGHT,
  RRF_K,
} from './lib/vector.constants';
export { normalizeChunkSourceType, toPgVectorLiteral } from './utils/source-type';
