import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { KNOWLEDGE_ENTITY_TYPE_OPTIONS } from '../types/knowledge.types';
import type { KnowledgeEntityType } from '../types/knowledge.types';
import { cn } from '@/lib/utils';

interface KnowledgeFiltersProps {
  search: string;
  entityType: KnowledgeEntityType | 'ALL';
  onSearchChange: (value: string) => void;
  onEntityTypeChange: (value: KnowledgeEntityType | 'ALL') => void;
}

export function KnowledgeFilters({
  search,
  entityType,
  onSearchChange,
  onEntityTypeChange,
}: KnowledgeFiltersProps) {
  return (
    <div className="space-y-3">
      <Input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Filter entries by title or content…"
        aria-label="Filter knowledge entries"
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Entity type filters">
        <Button
          type="button"
          size="sm"
          variant={entityType === 'ALL' ? 'default' : 'outline'}
          onClick={() => onEntityTypeChange('ALL')}
        >
          All
        </Button>
        {KNOWLEDGE_ENTITY_TYPE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={entityType === option.value ? 'default' : 'outline'}
            className={cn(entityType === option.value && 'shadow-sm')}
            onClick={() => onEntityTypeChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
