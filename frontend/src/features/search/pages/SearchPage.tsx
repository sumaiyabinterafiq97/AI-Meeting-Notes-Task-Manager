import { useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { ROUTES } from '@/lib/constants';
import { useSemanticSearch } from '../hooks/useSemanticSearch';
import { SearchResultsPanel } from '../components/SearchResultsPanel';
import { SemanticSearchFilters } from '../components/SemanticSearchFilters';
import { RecentSearches } from '../components/RecentSearches';
import { ExampleQueries } from '../components/ExampleQueries';
import { SearchModeBadge } from '../components/SearchModeBadge';

export function SearchPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const initialSourceTypes = searchParams.get('sourceTypes');

  const search = useSemanticSearch(workspaceId ?? '', Boolean(workspaceId));

  useEffect(() => {
    if (initialQuery) {
      search.setQuery(initialQuery);
    }
    if (initialSourceTypes === 'knowledge') {
      search.setSourceTypes(['knowledge']);
    }
    // Sync URL params on first load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  if (!workspaceId) {
    return <ErrorAlert message="Workspace not found" />;
  }

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleQuerySelect = (value: string) => {
    search.setQuery(value);
    setSearchParams({ q: value }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Search</h2>
        <p className="text-muted-foreground">
          Natural language search across meetings, tasks, transcripts, and AI summaries.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Workspace search</CardTitle>
              <CardDescription>
                Hybrid semantic + keyword retrieval with filters and citations.
              </CardDescription>
            </div>
            {search.data?.searchMode && <SearchModeBadge mode={search.data.searchMode} />}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search.query}
              onChange={(event) => {
                const value = event.target.value;
                search.setQuery(value);
                if (value.trim()) {
                  setSearchParams({ q: value.trim() }, { replace: true });
                } else {
                  setSearchParams({}, { replace: true });
                }
              }}
              placeholder="Search by meaning or keyword…"
              className="h-11 pl-9"
              aria-label="Search workspace"
              autoComplete="off"
            />
          </div>

          <SemanticSearchFilters
            type={search.type}
            onTypeChange={search.setType}
            mode={search.mode}
            onModeChange={search.setMode}
            dateFrom={search.dateFrom}
            onDateFromChange={search.setDateFrom}
            dateTo={search.dateTo}
            onDateToChange={search.setDateTo}
            sourceTypes={search.sourceTypes}
            onToggleSourceType={search.toggleSourceType}
          />

          {!search.canSearch && (
            <div className="grid gap-6 lg:grid-cols-2">
              <RecentSearches
                items={search.recentSearches}
                onSelect={handleQuerySelect}
                onClear={search.clearHistory}
              />
              <ExampleQueries onSelect={handleQuerySelect} />
            </div>
          )}

          <SearchResultsPanel
            workspaceId={workspaceId}
            query={search.query}
            debouncedQuery={search.debouncedQuery}
            canSearch={search.canSearch}
            type={search.type}
            onTypeChange={search.setType}
            data={search.data}
            isFetching={search.isFetching}
            isError={search.isError}
            hasResults={search.hasResults}
            onNavigate={handleNavigate}
            onSearchComplete={search.recordSearch}
            showTypeFilters={false}
            className="border shadow-none"
            scrollClassName="max-h-none"
            resultsId="workspace-search-results"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link to={ROUTES.DASHBOARD(workspaceId)}>Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
