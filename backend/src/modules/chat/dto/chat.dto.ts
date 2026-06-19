export interface SendChatMessageDto {
  message: string;
  sessionId?: string;
  meetingId?: string;
}

export interface ChatResponseDto {
  sessionId: string;
  messageId: string;
  reply: string;
  citations: Array<{
    index: number;
    chunkId: string;
    meetingId?: string;
    meetingTitle?: string;
    excerpt: string;
  }>;
  tokenUsage: { prompt: number; completion: number };
}
