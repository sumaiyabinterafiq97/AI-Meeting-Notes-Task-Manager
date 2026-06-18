import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useWorkspaceSearch } from '../hooks/useWorkspaceSearch';
import { SearchResultsPanel } from './SearchResultsPanel';

interface GlobalSearchProps {
  workspaceId: string;
}

export function GlobalSearch({ workspaceId }: GlobalSearchProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  const search = useWorkspaceSearch(workspaceId, open);

  const showPanel = open && (search.query.length > 0 || search.canSearch);

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
          aria-expanded={showPanel}
          aria-controls="global-search-results"
          autoComplete="off"
        />
      </div>

      {showPanel && (
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
          className="absolute left-0 right-0 top-full z-50 mt-1"
        />
      )}
    </div>
  );
}
