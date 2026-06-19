import { apiClient } from '@/lib/api-client';
import type { SearchFilters, SearchResponse } from '../types/search.types';

function toSearchParams(filters: SearchFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {
    q: filters.q,
  };

  if (filters.type) params.type = filters.type;
  if (filters.mode) params.mode = filters.mode;
  if (filters.page) params.page = filters.page;
  if (filters.limit) params.limit = filters.limit;
  if (filters.similarityMin != null) params.similarityMin = filters.similarityMin;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.meetingId) params.meetingId = filters.meetingId;
  if (filters.sourceTypes?.length) params.sourceTypes = filters.sourceTypes.join(',');

  return params;
}

export const searchApi = {
  search: (workspaceId: string, filters: SearchFilters) =>
    apiClient.get<SearchResponse>(`/workspaces/${workspaceId}/search`, {
      params: toSearchParams(filters),
    }),
};
