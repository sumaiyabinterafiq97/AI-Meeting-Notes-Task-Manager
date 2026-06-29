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
    sourceType?: string;
    meetingId?: string;
    meetingTitle?: string;
    meetingDate?: string;
    excerpt: string;
    similarityScore?: number;
    timestamp?: string;
    claimText?: string;
    confidence?: 'high' | 'medium' | 'low';
  }>;
  tokenUsage: { prompt: number; completion: number };
  grounded: boolean;
  refusalReason: string | null;
  injectionDetected: boolean;
}
