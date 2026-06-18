export type SearchType = 'meetings' | 'tasks' | 'all';

export interface SearchMeetingResult {
  id: string;
  title: string;
  meetingDate: string;
  status: string;
  tags: string[];
}

export interface SearchTaskResult {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  dueDate: string | null;
}

export interface SearchSnippetResult {
  meetingId: string;
  meetingTitle: string;
  field: string;
  excerpt: string;
}

export interface SearchResponse {
  meetings: SearchMeetingResult[];
  tasks: SearchTaskResult[];
  snippets: SearchSnippetResult[];
  meta: {
    page: number;
    limit: number;
    meetingsTotal: number;
    tasksTotal: number;
  };
}

export interface SearchFilters {
  q: string;
  type?: SearchType;
  page?: number;
  limit?: number;
}

export const MIN_SEARCH_QUERY_LENGTH = 2;
