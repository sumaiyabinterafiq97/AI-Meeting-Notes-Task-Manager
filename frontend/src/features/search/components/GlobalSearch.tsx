import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/lib/constants';
import { useWorkspaceSearch } from '../hooks/useWorkspaceSearch';
import { SearchResultsPanel } from './SearchResultsPanel';
import { RecentSearches } from './RecentSearches';

interface GlobalSearchProps {
  workspaceId: string;
}

export function GlobalSearch({ workspaceId }: GlobalSearchProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  const search = useWorkspaceSearch(workspaceId, open);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleNavigate = (path: string) => {
    setOpen(false);
    search.reset();
    navigate(path);
  };

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1 xl:max-w-md">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          type="search"
          value={search.query}
          onChange={(event) => {
            search.setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search meetings and tasks…"
          className="h-9 pl-9"
          aria-label="Search workspace"
          aria-expanded={open}
          aria-controls="global-search-results"
          autoComplete="off"
        />
      </div>

      {open && !search.query && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-card p-3 shadow-lg">
          {search.recentSearches.length > 0 ? (
            <RecentSearches
              items={search.recentSearches}
              onSelect={(value) => {
                search.setQuery(value);
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Search meetings, tasks, and AI summaries.</p>
          )}
          <Link
            to={ROUTES.SEARCH(workspaceId)}
            className="mt-3 block text-center text-xs font-medium text-primary hover:underline"
          >
            Advanced search
          </Link>
        </div>
      )}

      {open && search.query.length > 0 && (
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
          className="absolute left-0 right-0 top-full z-50 mt-1"
        />
      )}
    </div>
  );
}
