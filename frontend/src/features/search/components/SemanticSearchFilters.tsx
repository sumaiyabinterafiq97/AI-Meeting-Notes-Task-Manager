import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SEARCH_SOURCE_TYPE_OPTIONS,
  type SearchMode,
  type SearchSourceType,
  type SearchType,
} from '../types/search.types';

const typeOptions: { value: SearchType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'meetings', label: 'Meetings' },
  { value: 'tasks', label: 'Tasks' },
];

const modeOptions: { value: SearchMode; label: string }[] = [
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'semantic', label: 'Semantic' },
  { value: 'keyword', label: 'Keyword' },
];

interface SemanticSearchFiltersProps {
  type: SearchType;
  onTypeChange: (type: SearchType) => void;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  sourceTypes: SearchSourceType[];
  onToggleSourceType: (value: SearchSourceType) => void;
  compact?: boolean;
}

export function SemanticSearchFilters({
  type,
  onTypeChange,
  mode,
  onModeChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  sourceTypes,
  onToggleSourceType,
  compact = false,
}: SemanticSearchFiltersProps) {
  return (
    <div className={compact ? 'space-y-3' : 'grid gap-4 sm:grid-cols-2'}>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Result type</Label>
        <div className="flex flex-wrap gap-1">
          {typeOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={type === option.value ? 'default' : 'outline'}
              className="h-8"
              onClick={() => onTypeChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Search mode</Label>
        <div className="flex flex-wrap gap-1">
          {modeOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={mode === option.value ? 'default' : 'outline'}
              className="h-8"
              onClick={() => onModeChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="search-date-from" className="text-xs text-muted-foreground">
          From date
        </Label>
        <Input
          id="search-date-from"
          type="date"
          value={dateFrom}
          onChange={(event) => onDateFromChange(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="search-date-to" className="text-xs text-muted-foreground">
          To date
        </Label>
        <Input
          id="search-date-to"
          type="date"
          value={dateTo}
          onChange={(event) => onDateToChange(event.target.value)}
        />
      </div>

      <div className={compact ? 'space-y-2' : 'space-y-2 sm:col-span-2'}>
        <Label className="text-xs text-muted-foreground">Source types</Label>
        <div className="flex flex-wrap gap-1">
          {SEARCH_SOURCE_TYPE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={sourceTypes.includes(option.value) ? 'default' : 'outline'}
              className="h-8"
              onClick={() => onToggleSourceType(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
