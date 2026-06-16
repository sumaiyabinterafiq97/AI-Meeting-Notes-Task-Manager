export type SearchType = 'meetings' | 'tasks' | 'all';

export interface SearchQuery {
  q?: string;
  type?: SearchType;
  page?: string;
  limit?: string;
}

export interface SearchMeetingResult {
  id: string;
  title: string;
  meetingDate: Date;
  status: string;
  tags: string[];
}

export interface SearchTaskResult {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  dueDate: Date | null;
}

export interface SearchSnippetResult {
  meetingId: string;
  meetingTitle: string;
  field: string;
  excerpt: string;
}

export interface SearchResponseDto {
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
