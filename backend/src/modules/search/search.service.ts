import {
  SearchQuery,
  SearchResponseDto,
  SearchType,
  type SearchMode,
} from './search.dto';
import {
  searchRepository,
  shouldSearchMeetings,
  shouldSearchTasks,
} from './search.repository';
import { fetchSemanticSnippets, mergeSnippets } from './search-semantic';
import { AppError, ErrorCodes } from '../../utils/errors';
import { parsePagination } from '../../lib/pagination';

const MIN_QUERY_LENGTH = 2;
const SNIPPET_LIMIT = 10;

function normalizeType(type?: string): SearchType {
  if (type === 'meetings' || type === 'tasks' || type === 'all') {
    return type;
  }
  return 'all';
}

function normalizeMode(mode?: string): SearchMode {
  if (mode === 'keyword' || mode === 'semantic' || mode === 'hybrid') {
    return mode;
  }
  return 'hybrid';
}

function parseSourceTypes(value?: string | string[]): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const raw = Array.isArray(value) ? value.join(',') : value;
  const types = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return types.length > 0 ? types : undefined;
}

function parseDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export class SearchService {
  async search(workspaceId: string, query: SearchQuery): Promise<SearchResponseDto> {
    const startedAt = Date.now();
    const q = query.q?.trim() ?? '';

    if (q.length < MIN_QUERY_LENGTH) {
      throw new AppError(
        400,
        ErrorCodes.VALIDATION_ERROR,
        `Search query must be at least ${MIN_QUERY_LENGTH} characters`,
      );
    }

    const type = normalizeType(query.type);
    const requestedMode = normalizeMode(query.mode);
    const pagination = parsePagination(query);
    const sourceTypes = parseSourceTypes(query.sourceTypes);
    const similarityMin = query.similarityMin ? Number(query.similarityMin) : 0.65;
    const dateFrom = parseDate(query.dateFrom);
    const dateTo = parseDate(query.dateTo);

    const meetingsPromise = shouldSearchMeetings(type)
      ? searchRepository.searchMeetings(workspaceId, q, pagination)
      : Promise.resolve({ items: [], total: 0 });

    const tasksPromise = shouldSearchTasks(type)
      ? searchRepository.searchTasks(workspaceId, q, pagination)
      : Promise.resolve({ items: [], total: 0 });

    const keywordSnippetsPromise =
      type === 'all' || type === 'meetings'
        ? searchRepository.searchSummarySnippets(workspaceId, q, SNIPPET_LIMIT)
        : Promise.resolve([]);

    let searchMode: SearchMode = 'keyword';
    let degraded = false;
    let semanticSnippets: Awaited<ReturnType<typeof fetchSemanticSnippets>> = [];

    if (requestedMode !== 'keyword') {
      try {
        semanticSnippets = await fetchSemanticSnippets({
          workspaceId,
          query: q,
          mode: requestedMode,
          sourceTypes,
          meetingId: query.meetingId,
          similarityMin: Number.isFinite(similarityMin) ? similarityMin : 0.65,
          dateFrom,
          dateTo,
          limit: SNIPPET_LIMIT,
        });
        searchMode = requestedMode;
      } catch {
        degraded = true;
        searchMode = 'keyword';
      }
    }

    const [meetings, tasks, keywordSnippets] = await Promise.all([
      meetingsPromise,
      tasksPromise,
      keywordSnippetsPromise,
    ]);

    const keywordSnippetsWithMeta = keywordSnippets.map((snippet) => ({
      ...snippet,
      matchType: 'keyword' as const,
    }));

    const snippets =
      searchMode === 'keyword'
        ? keywordSnippetsWithMeta
        : mergeSnippets(semanticSnippets, keywordSnippetsWithMeta);

    return {
      query: q,
      searchMode,
      degraded,
      meetings: meetings.items.map((meeting) => ({
        ...meeting,
        matchType: 'keyword' as const,
      })),
      tasks: tasks.items.map((task) => ({
        ...task,
        matchType: 'keyword' as const,
      })),
      snippets,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        meetingsTotal: meetings.total,
        tasksTotal: tasks.total,
        snippetsTotal: snippets.length,
        searchDurationMs: Date.now() - startedAt,
      },
    };
  }
}

export const searchService = new SearchService();
