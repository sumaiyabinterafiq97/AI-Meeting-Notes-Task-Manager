import { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/chat.service';
import type { SendChatMessageDto } from '../dto/chat.dto';
import { routeParam } from '../../../utils/route-param';
import { attachStreamAbort, writeSseStream } from '../utils/stream-lifecycle';

function wantsStream(req: Request): boolean {
  if (req.query.stream === 'false') {
    return false;
  }

  const accept = req.headers.accept ?? '';
  return accept.includes('text/event-stream');
}

export class ChatController {
  async sendWorkspaceMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const userId = req.user!.id;
      const dto = req.body as SendChatMessageDto;

      if (wantsStream(req)) {
        await this.streamResponse(req, res, (signal) =>
          chatService.streamMessage(userId, workspaceId, dto, undefined, { signal }),
        );
        return;
      }

      const result = await chatService.sendMessage(userId, workspaceId, dto);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async sendMeetingMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const meetingId = routeParam(req.params.meetingId);
      const userId = req.user!.id;
      const dto = req.body as SendChatMessageDto;

      if (wantsStream(req)) {
        await this.streamResponse(req, res, (signal) =>
          chatService.streamMessage(userId, workspaceId, dto, meetingId, { signal }),
        );
        return;
      }

      const result = await chatService.sendMessage(userId, workspaceId, dto, meetingId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async listWorkspaceSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const sessions = await chatService.listWorkspaceSessions(req.user!.id, workspaceId);
      res.status(200).json({ data: sessions });
    } catch (error) {
      next(error);
    }
  }

  async getSessionMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const sessionId = routeParam(req.params.sessionId);
      const messages = await chatService.getSessionMessages(
        req.user!.id,
        workspaceId,
        sessionId,
      );
      res.status(200).json({ data: messages });
    } catch (error) {
      next(error);
    }
  }

  async getMeetingMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const meetingId = routeParam(req.params.meetingId);
      const messages = await chatService.getMeetingMessages(
        req.user!.id,
        workspaceId,
        meetingId,
      );
      res.status(200).json({ data: messages });
    } catch (error) {
      next(error);
    }
  }

  async clearSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const sessionId = routeParam(req.params.sessionId);
      await chatService.clearSession(req.user!.id, workspaceId, sessionId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  private async streamResponse(
    req: Request,
    res: Response,
    createEvents: (
      signal: AbortSignal,
    ) => AsyncGenerator<{ type: string; data: Record<string, unknown> }>,
  ): Promise<void> {
    const { controller, cleanup } = attachStreamAbort(req, res);

    try {
      await writeSseStream(res, createEvents(controller.signal) as never, controller.signal);
    } finally {
      cleanup();
    }
  }
}

export const chatController = new ChatController();
