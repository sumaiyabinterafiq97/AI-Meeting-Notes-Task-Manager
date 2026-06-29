import type { Request, Response } from 'express';
import { StreamCancelledError } from '../../llm/services/streaming.service';
import { formatSseEvent, initSseResponse } from './sse';
import type { StreamEvent } from '../types/chat.types';

export interface StreamAbortHandle {
  controller: AbortController;
  cleanup: () => void;
}

export function attachStreamAbort(req: Request, res: Response): StreamAbortHandle {
  const controller = new AbortController();

  const abort = () => {
    if (!controller.signal.aborted) {
      controller.abort(new StreamCancelledError('Client disconnected'));
    }
  };

  req.on('close', abort);
  res.on('close', abort);

  return {
    controller,
    cleanup: () => {
      req.off('close', abort);
      res.off('close', abort);
    },
  };
}

export async function writeSseStream(
  res: Response,
  events: AsyncGenerator<StreamEvent>,
  signal?: AbortSignal,
): Promise<void> {
  initSseResponse(res);

  try {
    for await (const event of events) {
      if (signal?.aborted || res.writableEnded) {
        break;
      }

      res.write(formatSseEvent(event.type, event.data));

      if (typeof (res as Response & { flush?: () => void }).flush === 'function') {
        (res as Response & { flush: () => void }).flush();
      }
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
}
