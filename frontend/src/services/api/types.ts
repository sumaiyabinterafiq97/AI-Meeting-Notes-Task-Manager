export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: PaginatedMeta;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
}

export type ChatStreamEventType = 'token' | 'citation' | 'done' | 'error';

export interface ChatStreamTokenEvent {
  event: 'token';
  data: { content: string };
}

export interface ChatStreamCitationEvent {
  event: 'citation';
  data: {
    index: number;
    chunkId: string;
    meetingId?: string;
    meetingTitle?: string;
    excerpt: string;
  };
}

export interface ChatStreamDoneEvent {
  event: 'done';
  data: {
    sessionId: string;
    messageId: string;
    tokenUsage?: TokenUsage;
  };
}

export interface ChatStreamErrorEvent {
  event: 'error';
  data: { code: string; message: string };
}

export type ChatStreamEvent =
  | ChatStreamTokenEvent
  | ChatStreamCitationEvent
  | ChatStreamDoneEvent
  | ChatStreamErrorEvent;

export interface StreamRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  onEvent: (event: ChatStreamEvent) => void;
}
