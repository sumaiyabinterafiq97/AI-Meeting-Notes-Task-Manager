import { prisma } from '../../config/database';
import { ragService } from '../rag/services/rag.service';
import type { RAGSearchMode } from '../rag/types/rag.types';
import type { SearchSnippetResult } from './search.dto';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlightExcerpt(excerpt: string, query: string): string {
  const safeExcerpt = escapeHtml(excerpt);
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((term) => term.length >= 2);

  if (terms.length === 0) {
    return safeExcerpt;
  }

  const pattern = terms.map(escapeRegex).join('|');
  return safeExcerpt.replace(
    new RegExp(`(${pattern})`, 'gi'),
    '<em>$1</em>',
  );
}

function trimExcerpt(content: string, maxLength = 200): string {
  if (content.length <= maxLength) {
    return content;
  }
  return `${content.slice(0, maxLength).trim()}…`;
}

export async function fetchSemanticSnippets(options: {
  workspaceId: string;
  query: string;
  mode: RAGSearchMode;
  sourceTypes?: string[];
  meetingId?: string;
  similarityMin?: number;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}): Promise<SearchSnippetResult[]> {
  const {
    workspaceId,
    query,
    mode,
    sourceTypes,
    meetingId,
    similarityMin = 0.65,
    dateFrom,
    dateTo,
    limit = 20,
  } = options;

  const result = await ragService.search({
    query,
    workspaceId,
    mode,
    meetingId,
    sourceTypes,
    topK: Math.min(limit * 2, 50),
  });

  const meetingIds = [
    ...new Set(result.chunks.map((chunk) => chunk.meetingId).filter(Boolean)),
  ] as string[];

  const meetings =
    meetingIds.length > 0
      ? await prisma.meeting.findMany({
          where: {
            id: { in: meetingIds },
            workspaceId,
            deletedAt: null,
            ...(dateFrom || dateTo
              ? {
                  meetingDate: {
                    ...(dateFrom ? { gte: dateFrom } : {}),
                    ...(dateTo ? { lte: dateTo } : {}),
                  },
                }
              : {}),
          },
          select: { id: true, title: true, meetingDate: true },
        })
      : [];

  const meetingMap = new Map(meetings.map((meeting) => [meeting.id, meeting]));
  const seen = new Set<string>();
  const snippets: SearchSnippetResult[] = [];

  for (const chunk of result.chunks) {
    if ((chunk.similarity ?? 0) < similarityMin) {
      continue;
    }

    if (!chunk.meetingId) {
      continue;
    }

    const meeting = meetingMap.get(chunk.meetingId);
    if (!meeting) {
      continue;
    }

    const dedupeKey = `${chunk.meetingId}:${chunk.sourceType}:${chunk.id}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    const excerpt = trimExcerpt(chunk.content);
    snippets.push({
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      field: chunk.sourceType,
      excerpt,
      sourceType: chunk.sourceType,
      relevanceScore: Math.round((chunk.similarity ?? 0) * 100) / 100,
      matchType: mode === 'keyword' ? 'keyword' : 'semantic',
      highlight: highlightExcerpt(excerpt, query),
    });

    if (snippets.length >= limit) {
      break;
    }
  }

  return snippets;
}

export function mergeSnippets(
  semantic: SearchSnippetResult[],
  keyword: SearchSnippetResult[],
): SearchSnippetResult[] {
  const merged = new Map<string, SearchSnippetResult>();

  for (const snippet of keyword) {
    const key = `${snippet.meetingId}:${snippet.field}:${snippet.excerpt.slice(0, 40)}`;
    merged.set(key, { ...snippet, matchType: snippet.matchType ?? 'keyword' });
  }

  for (const snippet of semantic) {
    const key = `${snippet.meetingId}:${snippet.field}:${snippet.excerpt.slice(0, 40)}`;
    const existing = merged.get(key);
    if (existing) {
      merged.set(key, {
        ...existing,
        matchType: 'both',
        relevanceScore: Math.max(existing.relevanceScore ?? 0, snippet.relevanceScore ?? 0),
        highlight: snippet.highlight ?? existing.highlight,
      });
    } else {
      merged.set(key, snippet);
    }
  }

  return [...merged.values()].sort(
    (a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0),
  );
}
