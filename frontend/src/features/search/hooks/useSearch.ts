import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../services/search-api';
import { searchKeys } from './search-keys';
import { MIN_SEARCH_QUERY_LENGTH, type SearchFilters } from '../types/search.types';

export function useSearch(workspaceId: string | undefined, filters: SearchFilters, enabled = true) {
  const canSearch = filters.q.trim().length >= MIN_SEARCH_QUERY_LENGTH;

  return useQuery({
    queryKey: searchKeys.query(workspaceId ?? '', filters),
    queryFn: async () => {
      const { data } = await searchApi.search(workspaceId!, filters);
      return data;
    },
    enabled: Boolean(workspaceId) && enabled && canSearch,
  });
}
