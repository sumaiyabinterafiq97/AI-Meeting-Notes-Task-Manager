import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatKnowledgeEntityType } from '../lib/knowledge-utils';
import type { KnowledgeEntry } from '../types/knowledge.types';

interface KnowledgeEntryCardProps {
  entry: KnowledgeEntry;
  onSelect: (entryId: string) => void;
  isSelected?: boolean;
}

export function KnowledgeEntryCard({ entry, onSelect, isSelected = false }: KnowledgeEntryCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(entry.id)}
      className="w-full text-left"
      aria-pressed={isSelected}
    >
      <Card className={isSelected ? 'border-primary/50 bg-accent/40' : 'hover:bg-muted/40'}>
        <CardHeader className="space-y-2 pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{entry.title}</CardTitle>
            <Badge variant="secondary">{formatKnowledgeEntityType(entry.entityType)}</Badge>
          </div>
          <CardDescription className="line-clamp-2">{entry.content}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {entry.confidence != null && (
            <Badge variant="outline">{Math.round(entry.confidence * 100)}% confidence</Badge>
          )}
        </CardContent>
      </Card>
    </button>
  );
}
