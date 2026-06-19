import { highlightQueryInText } from '../lib/highlight-query';
import { SearchMatchBadge } from './SearchModeBadge';
import type { SearchSnippetResult } from '../types/search.types';

interface SearchSnippetCardProps {
  snippet: SearchSnippetResult;
  query: string;
  onClick: () => void;
}

export function SearchSnippetCard({ snippet, query, onClick }: SearchSnippetCardProps) {
  const highlight = snippet.highlight ?? highlightQueryInText(snippet.excerpt, query);

  return (
    <button
      type="button"
      className="flex w-full flex-col gap-1 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
      onClick={onClick}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{snippet.meetingTitle}</span>
        <SearchMatchBadge matchType={snippet.matchType} />
        {snippet.relevanceScore != null && (
          <span className="text-xs text-muted-foreground">
            {Math.round(snippet.relevanceScore * 100)}% match
          </span>
        )}
      </div>
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {snippet.sourceType ?? snippet.field}
      </span>
      <span
        className="line-clamp-3 text-xs text-muted-foreground [&_em]:font-medium [&_em]:text-foreground [&_em]:not-italic"
        dangerouslySetInnerHTML={{ __html: highlight }}
      />
    </button>
  );
}
