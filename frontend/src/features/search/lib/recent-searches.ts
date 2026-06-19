const STORAGE_PREFIX = 'meetingmind:recent-searches';
const MAX_RECENT_SEARCHES = 10;

function storageKey(workspaceId: string): string {
  return `${STORAGE_PREFIX}:${workspaceId}`;
}

export function readRecentSearches(workspaceId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(workspaceId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function writeRecentSearch(workspaceId: string, query: string): string[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return readRecentSearches(workspaceId);
  }

  const next = [trimmed, ...readRecentSearches(workspaceId).filter((item) => item !== trimmed)].slice(
    0,
    MAX_RECENT_SEARCHES,
  );

  try {
    localStorage.setItem(storageKey(workspaceId), JSON.stringify(next));
  } catch {
    // ignore storage errors
  }

  return next;
}

export function clearRecentSearches(workspaceId: string): void {
  try {
    localStorage.removeItem(storageKey(workspaceId));
  } catch {
    // ignore storage errors
  }
}
