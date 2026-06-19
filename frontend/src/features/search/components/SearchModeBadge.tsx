import { Badge } from '@/components/ui/badge';
import type { SearchMatchType, SearchMode } from '../types/search.types';

const modeLabels: Record<SearchMode, string> = {
  hybrid: 'Hybrid',
  semantic: 'Semantic',
  keyword: 'Keyword',
};

const matchLabels: Record<SearchMatchType, string> = {
  semantic: 'Semantic',
  keyword: 'Keyword',
  both: 'Both',
};

interface SearchModeBadgeProps {
  mode: SearchMode;
}

export function SearchModeBadge({ mode }: SearchModeBadgeProps) {
  return (
    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
      {modeLabels[mode]}
    </Badge>
  );
}

interface SearchMatchBadgeProps {
  matchType?: SearchMatchType;
}

export function SearchMatchBadge({ matchType }: SearchMatchBadgeProps) {
  if (!matchType) {
    return null;
  }

  return (
    <Badge variant="secondary" className="text-[10px]">
      {matchLabels[matchType]}
    </Badge>
  );
}
