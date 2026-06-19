import { useMemo, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearch } from './useSearch';
import { useRecentSearches } from './useRecentSearches';
import {
  DEFAULT_SEARCH_MODE,
  MIN_SEARCH_QUERY_LENGTH,
  type SearchFilters,
  type SearchMode,
  type SearchSourceType,
  type SearchType,
} from '../types/search.types';

export interface SemanticSearchState {
  query: string;
  setQuery: (value: string) => void;
  type: SearchType;
  setType: (type: SearchType) => void;
  mode: SearchMode;
  setMode: (mode: SearchMode) => void;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
  sourceTypes: SearchSourceType[];
  setSourceTypes: (values: SearchSourceType[]) => void;
  toggleSourceType: (value: SearchSourceType) => void;
  debouncedQuery: string;
  canSearch: boolean;
  filters: SearchFilters;
  data: ReturnType<typeof useSearch>['data'];
  isFetching: boolean;
  isError: boolean;
  hasResults: boolean;
  recentSearches: string[];
  recordSearch: (query: string) => void;
  clearHistory: () => void;
  reset: () => void;
}

export function useSemanticSearch(
  workspaceId: string,
  enabled = true,
): SemanticSearchState {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<SearchType>('all');
  const [mode, setMode] = useState<SearchMode>(DEFAULT_SEARCH_MODE);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sourceTypes, setSourceTypes] = useState<SearchSourceType[]>([]);

  const debouncedQuery = useDebounce(query.trim(), 300);
  const canSearch = debouncedQuery.length >= MIN_SEARCH_QUERY_LENGTH;
  const { recentSearches, recordSearch, clearHistory } = useRecentSearches(workspaceId);

  const filters = useMemo<SearchFilters>(
    () => ({
      q: debouncedQuery,
      type,
      mode,
      limit: 15,
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(sourceTypes.length > 0 ? { sourceTypes } : {}),
    }),
    [debouncedQuery, type, mode, dateFrom, dateTo, sourceTypes],
  );

  const { data, isFetching, isError } = useSearch(workspaceId, filters, enabled && canSearch);

  const hasResults =
    data !== undefined &&
    (data.meetings.length > 0 || data.tasks.length > 0 || data.snippets.length > 0);

  const toggleSourceType = (value: SearchSourceType) => {
    setSourceTypes((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const reset = () => {
    setQuery('');
    setType('all');
    setMode(DEFAULT_SEARCH_MODE);
    setDateFrom('');
    setDateTo('');
    setSourceTypes([]);
  };

  return {
    query,
    setQuery,
    type,
    setType,
    mode,
    setMode,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sourceTypes,
    setSourceTypes,
    toggleSourceType,
    debouncedQuery,
    canSearch,
    filters,
    data,
    isFetching,
    isError,
    hasResults,
    recentSearches,
    recordSearch,
    clearHistory,
    reset,
  };
}
