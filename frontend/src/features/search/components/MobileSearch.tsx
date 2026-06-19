import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FullScreenPanel } from '@/components/common/FullScreenPanel';
import { ROUTES } from '@/lib/constants';
import { useWorkspaceSearch } from '../hooks/useWorkspaceSearch';
import { SearchResultsPanel } from './SearchResultsPanel';
import { RecentSearches } from './RecentSearches';

interface MobileSearchProps {
  workspaceId: string;
}

export function MobileSearch({ workspaceId }: MobileSearchProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  const search = useWorkspaceSearch(workspaceId, open);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    search.reset();
  };

  const handleNavigate = (path: string) => {
    handleClose();
    navigate(path);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0 xl:hidden"
        onClick={() => setOpen(true)}
        aria-label="Search workspace"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </Button>

      <FullScreenPanel
        open={open}
        onClose={handleClose}
        title="Search"
        description="Find meetings and tasks in this workspace"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              ref={inputRef}
              type="search"
              value={search.query}
              onChange={(event) => search.setQuery(event.target.value)}
              placeholder="Search meetings and tasks…"
              className="h-10 pl-9"
              aria-label="Search workspace"
              autoComplete="off"
            />
          </div>

          {!search.query && search.recentSearches.length > 0 && (
            <RecentSearches
              items={search.recentSearches}
              onSelect={(value) => search.setQuery(value)}
            />
          )}

          <Link
            to={ROUTES.SEARCH(workspaceId)}
            className="block text-center text-sm font-medium text-primary hover:underline"
            onClick={handleClose}
          >
            Advanced search
          </Link>

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
            resultsId="mobile-search-results"
            className="border-0 shadow-none"
            scrollClassName="max-h-[calc(100dvh-14rem)]"
          />
        </div>
      </FullScreenPanel>
    </>
  );
}
