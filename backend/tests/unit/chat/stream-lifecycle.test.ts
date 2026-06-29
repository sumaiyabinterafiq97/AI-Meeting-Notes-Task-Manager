import { EventEmitter } from 'events';
import { attachStreamAbort } from '../../../src/modules/chat/utils/stream-lifecycle';
import { StreamCancelledError } from '../../../src/modules/llm/services/streaming.service';

describe('stream lifecycle', () => {
  it('aborts when the client disconnects', () => {
    const req = new EventEmitter();
    const res = new EventEmitter() as EventEmitter & { writableEnded: boolean };
    res.writableEnded = false;

    const { controller, cleanup } = attachStreamAbort(req as never, res as never);
    req.emit('close');

    expect(controller.signal.aborted).toBe(true);
    expect(controller.signal.reason).toBeInstanceOf(StreamCancelledError);
    cleanup();
  });
});
