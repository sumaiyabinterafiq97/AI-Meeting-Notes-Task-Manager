import {
  SearchQuery,
  SearchResponseDto,
  SearchType,
} from './search.dto';
import {
  searchRepository,
  shouldSearchMeetings,
  shouldSearchTasks,
} from './search.repository';
import { AppError, ErrorCodes } from '../../utils/errors';
import { parsePagination } from '../../lib/pagination';

const MIN_QUERY_LENGTH = 2;
const SNIPPET_LIMIT = 5;

function normalizeType(type?: string): SearchType {
  if (type === 'meetings' || type === 'tasks' || type === 'all') {
    return type;
  }
  return 'all';
}

export class SearchService {
  async search(workspaceId: string, query: SearchQuery): Promise<SearchResponseDto> {
    const q = query.q?.trim() ?? '';

    if (q.length < MIN_QUERY_LENGTH) {
      throw new AppError(
        400,
        ErrorCodes.VALIDATION_ERROR,
        `Search query must be at least ${MIN_QUERY_LENGTH} characters`,
      );
    }

    const type = normalizeType(query.type);
    const pagination = parsePagination(query);

    const meetingsPromise = shouldSearchMeetings(type)
      ? searchRepository.searchMeetings(workspaceId, q, pagination)
      : Promise.resolve({ items: [], total: 0 });

    const tasksPromise = shouldSearchTasks(type)
      ? searchRepository.searchTasks(workspaceId, q, pagination)
      : Promise.resolve({ items: [], total: 0 });

    const snippetsPromise =
      type === 'all' || type === 'meetings'
        ? searchRepository.searchSummarySnippets(workspaceId, q, SNIPPET_LIMIT)
        : Promise.resolve([]);

    const [meetings, tasks, snippets] = await Promise.all([
      meetingsPromise,
      tasksPromise,
      snippetsPromise,
    ]);

    return {
      meetings: meetings.items,
      tasks: tasks.items,
      snippets,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        meetingsTotal: meetings.total,
        tasksTotal: tasks.total,
      },
    };
  }
}

export const searchService = new SearchService();
