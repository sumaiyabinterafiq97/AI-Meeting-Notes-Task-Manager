import type { ChatStreamEvent } from './types';

export interface ParsedSseBlock {
  event?: string;
  data?: string;
}

export function parseSseBlock(block: string): ParsedSseBlock {
  const lines = block.split('\n');
  let event: string | undefined;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  return {
    event,
    data: dataLines.length > 0 ? dataLines.join('\n') : undefined,
  };
}

export function toChatStreamEvent(event: string, data: string): ChatStreamEvent | null {
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;

    switch (event) {
      case 'token':
        return { event: 'token', data: { content: String(parsed.content ?? '') } };
      case 'citation':
        return {
          event: 'citation',
          data: {
            index: Number(parsed.index),
            chunkId: String(parsed.chunkId ?? ''),
            meetingId: parsed.meetingId ? String(parsed.meetingId) : undefined,
            meetingTitle: parsed.meetingTitle ? String(parsed.meetingTitle) : undefined,
            excerpt: String(parsed.excerpt ?? ''),
          },
        };
      case 'done':
        return {
          event: 'done',
          data: {
            sessionId: String(parsed.sessionId ?? ''),
            messageId: String(parsed.messageId ?? ''),
            tokenUsage: parsed.tokenUsage as
              | { prompt: number; completion: number }
              | undefined,
          },
        };
      case 'error':
        return {
          event: 'error',
          data: {
            code: String(parsed.code ?? 'STREAM_ERROR'),
            message: String(parsed.message ?? 'Streaming failed'),
          },
        };
      default:
        return null;
    }
  } catch {
    return null;
  }
}
