export type ChatScope = 'workspace' | 'meeting';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  citations?: ChatCitation[];
  tokenUsage?: { prompt: number; completion: number };
  createdAt: string;
}

export interface ChatCitation {
  index: number;
  chunkId: string;
  meetingId?: string;
  meetingTitle?: string;
  excerpt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  workspaceId: string;
  meetingId?: string;
  title?: string;
  scope: ChatScope;
  createdAt: string;
  updatedAt: string;
}

export interface StreamEvent {
  type: 'token' | 'citation' | 'done' | 'error';
  data: Record<string, unknown>;
}
