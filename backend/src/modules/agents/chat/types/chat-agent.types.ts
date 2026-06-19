export interface ChatAgentInput {
  userMessage: string;
  workspaceId: string;
  meetingId?: string;
  chatHistory: Array<{ role: string; content: string }>;
}

export interface ChatAgentOutput {
  content: string;
  citations: Array<{ index: number; chunkId: string; excerpt: string }>;
}
