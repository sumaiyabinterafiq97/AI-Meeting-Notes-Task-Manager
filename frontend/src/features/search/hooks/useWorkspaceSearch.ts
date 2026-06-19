import { useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearch } from './useSearch';
import { useRecentSearches } from './useRecentSearches';
import {
  DEFAULT_SEARCH_MODE,
  MIN_SEARCH_QUERY_LENGTH,
  type SearchMode,
  type SearchType,
} from '../types/search.types';

export function useWorkspaceSearch(workspaceId: string, enabled: boolean) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<SearchType>('all');
  const [mode, setMode] = useState<SearchMode>(DEFAULT_SEARCH_MODE);

  const debouncedQuery = useDebounce(query.trim(), 300);
  const canSearch = debouncedQuery.length >= MIN_SEARCH_QUERY_LENGTH;
  const { recentSearches, recordSearch } = useRecentSearches(workspaceId);

  const { data, isFetching, isError } = useSearch(
    workspaceId,
    { q: debouncedQuery, type, mode, limit: 10 },
    enabled && canSearch,
  );

  const hasResults =
    data !== undefined &&
    (data.meetings.length > 0 || data.tasks.length > 0 || data.snippets.length > 0);

  const reset = () => {
    setQuery('');
    setType('all');
    setMode(DEFAULT_SEARCH_MODE);
  };

  return {
    query,
    setQuery,
    type,
    setType,
    mode,
    setMode,
    debouncedQuery,
    canSearch,
    data,
    isFetching,
    isError,
    hasResults,
    recentSearches,
    recordSearch,
    reset,
  };
}
