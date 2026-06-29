export interface MemoryChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface MemoryConfig {
  maxMessages: number;
  maxTokens: number;
  summarizeThreshold: number;
  keepRecentMessages: number;
  rollingSummaryInterval: number;
  summaryMaxChars: number;
  sessionTtlSeconds: number;
}

export interface SessionMemoryState {
  rollingSummary: string | null;
  messageCount: number;
  lastSummaryAtCount: number;
  updatedAt: string;
}

export interface PrepareContextInput {
  workspaceId: string;
  sessionId?: string;
  history: MemoryChatMessage[];
  /** Total persisted messages including the current user turn. */
  messageCount?: number;
}

export interface PrepareContextResult {
  messages: MemoryChatMessage[];
  droppedCount: number;
  tokenCount: number;
  rollingSummaryUsed: boolean;
  sessionKey?: string;
}

export interface RecordTurnInput {
  workspaceId: string;
  sessionId: string;
  messageCount: number;
  history: MemoryChatMessage[];
}

export interface MemoryValidationResult {
  valid: boolean;
  warnings: string[];
}
