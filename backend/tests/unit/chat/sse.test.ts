import { formatSseEvent } from '../../../src/modules/chat/utils/sse';

describe('sse utils', () => {
  it('formats server-sent events', () => {
    const event = formatSseEvent('token', { content: 'Hello' });
    expect(event).toBe('event: token\ndata: {"content":"Hello"}\n\n');
  });
});
