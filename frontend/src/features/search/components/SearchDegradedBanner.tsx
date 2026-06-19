import { AlertTriangle } from 'lucide-react';

export function SearchDegradedBanner() {
  return (
    <div
      className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
      role="status"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>
        Semantic search is temporarily unavailable. Showing keyword results instead.
      </p>
    </div>
  );
}
