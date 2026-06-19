import type { KnowledgeEntry, KnowledgeEntityType } from '../types/knowledge.types';

export function formatKnowledgeEntityType(type: KnowledgeEntityType): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

export function filterKnowledgeEntries(
  entries: KnowledgeEntry[],
  search: string,
): KnowledgeEntry[] {
  const normalized = search.trim().toLowerCase();
  if (!normalized) {
    return entries;
  }

  return entries.filter(
    (entry) =>
      entry.title.toLowerCase().includes(normalized) ||
      entry.content.toLowerCase().includes(normalized),
  );
}

export function getDecisionTimelineEntries(entries: KnowledgeEntry[]): KnowledgeEntry[] {
  return entries
    .filter((entry) => entry.entityType === 'DECISION')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
