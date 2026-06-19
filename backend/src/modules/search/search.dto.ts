export type SearchType = 'meetings' | 'tasks' | 'all';

export type SearchMode = 'keyword' | 'semantic' | 'hybrid';

export type SearchMatchType = 'semantic' | 'keyword' | 'both';

export interface SearchQuery {
  q?: string;
  type?: SearchType;
  mode?: SearchMode;
  page?: string;
  limit?: string;
  similarityMin?: string;
  dateFrom?: string;
  dateTo?: string;
  sourceTypes?: string | string[];
  meetingId?: string;
}

export interface SearchMeetingResult {
  id: string;
  title: string;
  meetingDate: Date;
  status: string;
  tags: string[];
  relevanceScore?: number;
  matchType?: SearchMatchType;
}

export interface SearchTaskResult {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  dueDate: Date | null;
  relevanceScore?: number;
  matchType?: SearchMatchType;
}

export interface SearchSnippetResult {
  meetingId: string;
  meetingTitle: string;
  field: string;
  excerpt: string;
  sourceType?: string;
  relevanceScore?: number;
  matchType?: SearchMatchType;
  highlight?: string;
}

export interface SearchResponseDto {
  query: string;
  searchMode: SearchMode;
  degraded?: boolean;
  meetings: SearchMeetingResult[];
  tasks: SearchTaskResult[];
  snippets: SearchSnippetResult[];
  meta: {
    page: number;
    limit: number;
    meetingsTotal: number;
    tasksTotal: number;
    snippetsTotal?: number;
    searchDurationMs?: number;
  };
}
