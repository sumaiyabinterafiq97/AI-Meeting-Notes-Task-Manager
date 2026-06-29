import type { HybridSearchQuery } from '../types/vector.types';
import type { HybridFusionStrategy } from '../types/hybrid-search.types';
import { hybridSearchService } from './hybrid-search.service';
import { filterValidatorService } from './filter-validator.service';

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../lib/vector.constants';

export class VectorService {
  async searchPaginated(query: HybridSearchQuery): Promise<import('../types/vector.types').PaginatedSearchResult> {
    const parsed = {
      page: query.page ?? 1,
      pageSize: Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
    };
    const fetchLimit = parsed.page * parsed.pageSize;
    const results = await this.hybridSearch({
      ...query,
      topK: Math.max(fetchLimit, query.topK ?? 20),
    });

    const start = (parsed.page - 1) * parsed.pageSize;
    const items = results.slice(start, start + parsed.pageSize);

    return {
      items,
      total: results.length,
      page: parsed.page,
      pageSize: parsed.pageSize,
      hasMore: results.length > start + parsed.pageSize,
    };
  }

  async hybridSearch(
    query: HybridSearchQuery,
    fusionStrategy: HybridFusionStrategy = 'rrf',
  ): Promise<import('../types/vector.types').DocumentChunk[]> {
    filterValidatorService.validate(query);
    const result = await hybridSearchService.search(query, fusionStrategy);
    return hybridSearchService.toDocumentChunks(result);
  }

  async hybridSearchDetailed(
    query: HybridSearchQuery,
    fusionStrategy: HybridFusionStrategy = 'rrf',
  ) {
    filterValidatorService.validate(query);
    return hybridSearchService.search(query, fusionStrategy);
  }

  async keywordOnlySearch(query: HybridSearchQuery): Promise<import('../types/vector.types').DocumentChunk[]> {
    filterValidatorService.validate(query);
    const result = await hybridSearchService.search({ ...query, mode: 'keyword' });
    return hybridSearchService.toDocumentChunks(result);
  }

  async semanticSearch(query: HybridSearchQuery): Promise<import('../types/vector.types').DocumentChunk[]> {
    return hybridSearchService.semanticSearch(query);
  }

  async similaritySearch(query: HybridSearchQuery): Promise<import('../types/vector.types').DocumentChunk[]> {
    return this.semanticSearch(query);
  }
}

export const vectorService = new VectorService();
