import type { SearchFilters } from '../types/search.types';

export const searchKeys = {
  all: ['search'] as const,
  query: (workspaceId: string, filters: SearchFilters) =>
    [...searchKeys.all, workspaceId, filters] as const,
};
