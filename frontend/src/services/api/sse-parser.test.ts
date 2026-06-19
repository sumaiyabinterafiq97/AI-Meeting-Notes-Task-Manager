import { describe, it, expect } from 'vitest';
import { parseSseBlock, toChatStreamEvent } from './sse-parser';

describe('sse-parser', () => {
  it('parses SSE blocks', () => {
    const block = 'event: token\ndata: {"content":"Hello"}\n';
    expect(parseSseBlock(block)).toEqual({
      event: 'token',
      data: '{"content":"Hello"}',
    });
  });

  it('maps token events', () => {
    const event = toChatStreamEvent('token', '{"content":"Hi"}');
    expect(event).toEqual({ event: 'token', data: { content: 'Hi' } });
  });

  it('maps citation events', () => {
    const event = toChatStreamEvent(
      'citation',
      '{"index":1,"chunkId":"c1","meetingId":"m1","meetingTitle":"Planning","excerpt":"decided"}',
    );
    expect(event?.event).toBe('citation');
    if (event?.event === 'citation') {
      expect(event.data.index).toBe(1);
      expect(event.data.meetingTitle).toBe('Planning');
    }
  });

  it('maps done events', () => {
    const event = toChatStreamEvent(
      'done',
      '{"sessionId":"s1","messageId":"msg1","tokenUsage":{"prompt":10,"completion":5}}',
    );
    expect(event?.event).toBe('done');
  });

  it('maps error events', () => {
    const event = toChatStreamEvent('error', '{"code":"CHAT_ERROR","message":"Failed"}');
    expect(event).toEqual({
      event: 'error',
      data: { code: 'CHAT_ERROR', message: 'Failed' },
    });
  });
});
