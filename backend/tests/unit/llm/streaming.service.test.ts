import {
  StreamCancelledError,
  isStreamCancelled,
  streamBufferedText,
  throwIfAborted,
} from '../../../src/modules/llm/services/streaming.service';

describe('streaming service', () => {
  it('throws when signal is aborted', () => {
    const controller = new AbortController();
    controller.abort();

    expect(() => throwIfAborted(controller.signal)).toThrow(StreamCancelledError);
    expect(isStreamCancelled(new StreamCancelledError())).toBe(true);
    expect(isStreamCancelled(new DOMException('Aborted', 'AbortError'))).toBe(true);
  });

  it('streams buffered text with whitespace preserved', async () => {
    const chunks: string[] = [];
    for await (const chunk of streamBufferedText('Hello world')) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe('Hello world');
  });

  it('stops buffered streaming when aborted', async () => {
    const controller = new AbortController();
    const chunks: string[] = [];

    await expect(async () => {
      for await (const chunk of streamBufferedText('one two three four', controller.signal)) {
        chunks.push(chunk);
        if (chunks.length === 2) {
          controller.abort();
        }
      }
    }).rejects.toThrow(StreamCancelledError);

    expect(chunks.length).toBe(2);
  });
});
