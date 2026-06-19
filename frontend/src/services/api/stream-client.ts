import { API_BASE_URL } from '@/lib/constants';
import { getAccessToken } from '@/lib/api-client';
import { parseSseBlock, toChatStreamEvent } from './sse-parser';
import type { StreamRequestOptions } from './types';

export async function streamRequest(options: StreamRequestOptions): Promise<void> {
  const {
    url,
    method = 'POST',
    body,
    headers = {},
    signal,
    onEvent,
  } = options;

  const token = getAccessToken();
  const response = await fetch(url.startsWith('http') ? url : `${API_BASE_URL}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const errorBody = (await response.json()) as { error?: { message?: string } };
      message = errorBody.error?.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error('Streaming response has no body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const processBlock = (block: string): void => {
    if (!block.trim()) {
      return;
    }

    const parsed = parseSseBlock(block);
    if (!parsed.event || !parsed.data) {
      return;
    }

    const event = toChatStreamEvent(parsed.event, parsed.data);
    if (event) {
      onEvent(event);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';

    for (const block of blocks) {
      processBlock(block);
    }
  }

  if (buffer.trim()) {
    processBlock(buffer);
  }
}
