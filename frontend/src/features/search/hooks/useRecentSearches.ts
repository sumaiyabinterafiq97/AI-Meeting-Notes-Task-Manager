import { useCallback, useState } from 'react';
import {
  clearRecentSearches,
  readRecentSearches,
  writeRecentSearch,
} from '../lib/recent-searches';

function readForWorkspace(workspaceId: string | undefined): string[] {
  return workspaceId ? readRecentSearches(workspaceId) : [];
}

export function useRecentSearches(workspaceId: string | undefined) {
  const [cache, setCache] = useState<{ id: string | undefined; items: string[] }>(() => ({
    id: workspaceId,
    items: readForWorkspace(workspaceId),
  }));

  if (cache.id !== workspaceId) {
    setCache({
      id: workspaceId,
      items: readForWorkspace(workspaceId),
    });
  }

  const recordSearch = useCallback(
    (query: string) => {
      if (!workspaceId) {
        return;
      }
      setCache({
        id: workspaceId,
        items: writeRecentSearch(workspaceId, query),
      });
    },
    [workspaceId],
  );

  const clearHistory = useCallback(() => {
    if (!workspaceId) {
      return;
    }
    clearRecentSearches(workspaceId);
    setCache({ id: workspaceId, items: [] });
  }, [workspaceId]);

  return {
    recentSearches: cache.items,
    recordSearch,
    clearHistory,
  };
}
