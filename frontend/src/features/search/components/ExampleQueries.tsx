import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEARCH_EXAMPLE_QUERIES } from '../types/search.types';

interface ExampleQueriesProps {
  onSelect: (query: string) => void;
}

export function ExampleQueries({ onSelect }: ExampleQueriesProps) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Try searching
      </h3>
      <div className="flex flex-col gap-2">
        {SEARCH_EXAMPLE_QUERIES.map((query) => (
          <Button
            key={query}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto justify-start whitespace-normal px-3 py-2 text-left text-sm font-normal"
            onClick={() => onSelect(query)}
          >
            {query}
          </Button>
        ))}
      </div>
    </div>
  );
}
