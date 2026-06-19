import { Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecentSearchesProps {
  items: string[];
  onSelect: (query: string) => void;
  onClear?: () => void;
}

export function RecentSearches({ items, onSelect, onClear }: RecentSearchesProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Recent searches
        </h3>
        {onClear && (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClear}>
            <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Button
            key={item}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto max-w-full whitespace-normal px-2.5 py-1.5 text-left text-xs font-normal"
            onClick={() => onSelect(item)}
          >
            {item}
          </Button>
        ))}
      </div>
    </div>
  );
}
