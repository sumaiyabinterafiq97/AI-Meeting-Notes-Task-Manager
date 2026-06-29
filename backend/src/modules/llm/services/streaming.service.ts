export class StreamCancelledError extends Error {
  constructor(message = 'Stream cancelled') {
    super(message);
    this.name = 'StreamCancelledError';
  }
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new StreamCancelledError(
      signal.reason instanceof Error ? signal.reason.message : 'Stream cancelled',
    );
  }
}

export function isStreamCancelled(error: unknown): boolean {
  if (error instanceof StreamCancelledError) {
    return true;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }

  if (typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError') {
    return true;
  }

  return false;
}

export async function* streamBufferedText(
  text: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const parts = text.split(/(\s+)/).filter((part) => part.length > 0);

  for (const part of parts) {
    throwIfAborted(signal);
    yield part;
  }
}
