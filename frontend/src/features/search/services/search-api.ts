import { apiClient } from '@/lib/api-client';
import type { SearchFilters, SearchResponse } from '../types/search.types';

export const searchApi = {
  search: (workspaceId: string, filters: SearchFilters) =>
    apiClient.get<SearchResponse>(`/workspaces/${workspaceId}/search`, { params: filters }),
};
