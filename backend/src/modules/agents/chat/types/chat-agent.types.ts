export interface ChatAgentInput {
  userMessage: string;
  workspaceId: string;
  meetingId?: string;
  chatHistory: Array<{ role: string; content: string }>;
  workspaceName?: string;
  sessionId?: string;
  /** Total messages in session including the current user turn. */
  messageCount?: number;
}

export interface ChatAgentCitation {
  index: number;
  chunkId: string;
  excerpt: string;
  meetingId?: string;
  meetingTitle?: string;
  claimText?: string;
}

export interface ChatAgentOutput {
  content: string;
  citations: ChatAgentCitation[];
  grounded?: boolean;
  refusalReason?: string | null;
  injectionDetected?: boolean;
}

export interface ChatTurnMetadata {
  injectionDetected: boolean;
  emptyContext: boolean;
  historyCompressed: number;
  promptVersion: string;
  queryIntent?: string;
  queryIntentConfidence?: number;
}

export interface ChatValidationResult {
  valid: boolean;
  warnings: string[];
  orphanCitationIndices: number[];
}
