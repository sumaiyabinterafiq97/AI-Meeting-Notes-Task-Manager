import { useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearch } from './useSearch';
import { MIN_SEARCH_QUERY_LENGTH, type SearchType } from '../types/search.types';

export function useWorkspaceSearch(workspaceId: string, enabled: boolean) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<SearchType>('all');

  const debouncedQuery = useDebounce(query.trim(), 300);
  const canSearch = debouncedQuery.length >= MIN_SEARCH_QUERY_LENGTH;

  const { data, isFetching, isError } = useSearch(
    workspaceId,
    { q: debouncedQuery, type, limit: 10 },
    enabled && canSearch,
  );

  const hasResults =
    data !== undefined &&
    (data.meetings.length > 0 || data.tasks.length > 0 || data.snippets.length > 0);

  const reset = () => {
    setQuery('');
    setType('all');
  };

  return {
    query,
    setQuery,
    type,
    setType,
    debouncedQuery,
    canSearch,
    data,
    isFetching,
    isError,
    hasResults,
    reset,
  };
}
