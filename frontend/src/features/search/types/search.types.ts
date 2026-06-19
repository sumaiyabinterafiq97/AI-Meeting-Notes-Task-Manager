export type SearchType = 'meetings' | 'tasks' | 'all';

export type SearchMode = 'keyword' | 'semantic' | 'hybrid';

export type SearchMatchType = 'semantic' | 'keyword' | 'both';

export type SearchSourceType =
  | 'transcript'
  | 'summary'
  | 'decision'
  | 'action_item'
  | 'knowledge';

export interface SearchMeetingResult {
  id: string;
  title: string;
  meetingDate: string;
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
  dueDate: string | null;
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

export interface SearchResponse {
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

export interface SearchFilters {
  q: string;
  type?: SearchType;
  mode?: SearchMode;
  page?: number;
  limit?: number;
  similarityMin?: number;
  dateFrom?: string;
  dateTo?: string;
  sourceTypes?: SearchSourceType[];
  meetingId?: string;
}

export const MIN_SEARCH_QUERY_LENGTH = 2;

export const DEFAULT_SEARCH_MODE: SearchMode = 'hybrid';

export const SEARCH_EXAMPLE_QUERIES = [
  'What did we decide about the launch date?',
  'Find meetings about authentication',
  'Show high priority tasks',
  'Summarize sprint planning discussions',
] as const;

export const SEARCH_SOURCE_TYPE_OPTIONS: { value: SearchSourceType; label: string }[] = [
  { value: 'transcript', label: 'Transcripts' },
  { value: 'summary', label: 'Summaries' },
  { value: 'decision', label: 'Decisions' },
  { value: 'action_item', label: 'Action items' },
  { value: 'knowledge', label: 'Knowledge' },
];
