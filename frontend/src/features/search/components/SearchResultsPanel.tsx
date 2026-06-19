import { useEffect } from 'react';
import { FileText, CheckSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { MIN_SEARCH_QUERY_LENGTH, type SearchResponse, type SearchType } from '../types/search.types';
import { SearchDegradedBanner } from './SearchDegradedBanner';
import { SearchMatchBadge, SearchModeBadge } from './SearchModeBadge';
import { SearchSnippetCard } from './SearchSnippetCard';

const typeOptions: { value: SearchType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'meetings', label: 'Meetings' },
  { value: 'tasks', label: 'Tasks' },
];

interface SearchResultsPanelProps {
  workspaceId: string;
  query: string;
  debouncedQuery: string;
  canSearch: boolean;
  type: SearchType;
  onTypeChange: (type: SearchType) => void;
  data: SearchResponse | undefined;
  isFetching: boolean;
  isError: boolean;
  hasResults: boolean;
  onNavigate: (path: string) => void;
  onSearchComplete?: (query: string) => void;
  className?: string;
  scrollClassName?: string;
  resultsId?: string;
  showTypeFilters?: boolean;
}

export function SearchResultsPanel({
  workspaceId,
  query,
  debouncedQuery,
  canSearch,
  type,
  onTypeChange,
  data,
  isFetching,
  isError,
  hasResults,
  onNavigate,
  onSearchComplete,
  className,
  scrollClassName,
  resultsId = 'global-search-results',
  showTypeFilters = true,
}: SearchResultsPanelProps) {
  const showPanel = query.length > 0 || canSearch;

  useEffect(() => {
    if (canSearch && data && !isFetching && onSearchComplete) {
      onSearchComplete(debouncedQuery);
    }
  }, [canSearch, data, debouncedQuery, isFetching, onSearchComplete]);

  if (!showPanel) {
    return null;
  }

  return (
    <div
      id={resultsId}
      role="region"
      aria-label="Search results"
      className={cn('rounded-md border bg-card shadow-lg', className)}
    >
      {showTypeFilters && (
        <div className="flex items-center justify-between gap-2 border-b p-2">
          <div className="flex gap-1">
            {typeOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={type === option.value ? 'default' : 'ghost'}
                className="h-7 px-2 text-xs"
                onClick={() => onTypeChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          {data?.searchMode && <SearchModeBadge mode={data.searchMode} />}
        </div>
      )}

      <div className={cn('max-h-80 overflow-auto p-2 sm:max-h-96', scrollClassName)}>
        {data?.degraded && (
          <div className="mb-3">
            <SearchDegradedBanner />
          </div>
        )}

        {!canSearch && (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            Type at least {MIN_SEARCH_QUERY_LENGTH} characters to search
          </p>
        )}

        {canSearch && isFetching && (
          <div className="flex justify-center py-6">
            <LoadingSpinner label="Searching" />
          </div>
        )}

        {canSearch && !isFetching && isError && (
          <p className="px-2 py-4 text-center text-sm text-destructive">
            Search failed. Please try again.
          </p>
        )}

        {canSearch && !isFetching && !isError && !hasResults && (
          <div className="space-y-2 px-2 py-4 text-center text-sm text-muted-foreground">
            <p>No results for &ldquo;{debouncedQuery}&rdquo;</p>
            <p className="text-xs">Try hybrid mode, different keywords, or broaden your filters.</p>
          </div>
        )}

        {canSearch && !isFetching && data && data.meetings.length > 0 && (
          <section className="mb-3">
            <h3 className="mb-1 flex items-center gap-1.5 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Meetings
            </h3>
            <ul>
              {data.meetings.map((meeting) => (
                <li key={meeting.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-1 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => onNavigate(ROUTES.MEETING_DETAIL(workspaceId, meeting.id))}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{meeting.title}</span>
                      <SearchMatchBadge matchType={meeting.matchType} />
                    </div>
                    <span className="text-xs text-muted-foreground">{meeting.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {canSearch && !isFetching && data && data.tasks.length > 0 && (
          <section className="mb-3">
            <h3 className="mb-1 flex items-center gap-1.5 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
              Tasks
            </h3>
            <ul>
              {data.tasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-1 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => onNavigate(ROUTES.TASKS(workspaceId, task.id))}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{task.title}</span>
                      <SearchMatchBadge matchType={task.matchType} />
                    </div>
                    <span className="text-xs text-muted-foreground">{task.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {canSearch && !isFetching && data && data.snippets.length > 0 && (
          <section>
            <h3 className="mb-1 flex items-center gap-1.5 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Semantic matches
            </h3>
            <ul>
              {data.snippets.map((snippet) => (
                <li key={`${snippet.meetingId}-${snippet.field}-${snippet.excerpt.slice(0, 24)}`}>
                  <SearchSnippetCard
                    snippet={snippet}
                    query={debouncedQuery}
                    onClick={() =>
                      onNavigate(ROUTES.MEETING_DETAIL(workspaceId, snippet.meetingId))
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {canSearch && !isFetching && data?.meta.searchDurationMs != null && hasResults && (
          <p className="px-2 pt-2 text-center text-xs text-muted-foreground">
            {data.meta.snippetsTotal ?? data.snippets.length} snippets ·{' '}
            {data.meta.searchDurationMs}ms
          </p>
        )}
      </div>
    </div>
  );
}
