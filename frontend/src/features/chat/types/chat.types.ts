import type { CitationData } from '@/components/ai/CitationCard';
import type { TokenUsage } from '@/services/api';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  citations?: CitationData[];
  tokenUsage?: TokenUsage;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  workspaceId: string;
  meetingId?: string;
  title?: string;
  scope: 'workspace' | 'meeting';
  createdAt: string;
  updatedAt: string;
}

export interface SendChatMessagePayload {
  message: string;
  sessionId?: string;
  meetingId?: string;
}

export interface ChatResponse {
  sessionId: string;
  messageId: string;
  reply: string;
  citations: CitationData[];
  tokenUsage: TokenUsage;
}

export interface StreamingChatState {
  content: string;
  citations: CitationData[];
  isStreaming: boolean;
  error: string | null;
  sessionId: string | null;
}

export const MAX_CHAT_MESSAGE_LENGTH = 4000;

export const CHAT_EMPTY_STATE_EXAMPLES = [
  'What were the key decisions?',
  'Summarize the action items',
  'What risks were discussed?',
  'Who is responsible for what?',
] as const;

export const WORKSPACE_CHAT_EMPTY_STATE_EXAMPLES = [
  'What did we decide about the product launch?',
  'Summarize open risks across recent meetings',
  'Which tasks are still unassigned?',
  'What blockers came up this week?',
] as const;
