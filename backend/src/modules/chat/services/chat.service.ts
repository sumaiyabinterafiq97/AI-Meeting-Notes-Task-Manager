import { ChatRole } from '@prisma/client';
import { AppError, ErrorCodes } from '../../../utils/errors';
import { chatAgent, buildChatCorrelationId } from '../../agents/chat/services/chat-agent.service';
import { conversationMemoryService } from '../../agents/memory';
import { chatRepository } from '../chat.repository';
import type { SendChatMessageDto } from '../dto/chat.dto';
import type { ChatCitation, ChatMessage, ChatSession, StreamEvent, ChatStreamOptions } from '../types/chat.types';
import { isStreamCancelled } from '../../llm/services/streaming.service';

const HISTORY_LIMIT = 20;

function mapMessage(message: {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  citations: unknown;
  tokenUsage: unknown;
  createdAt: Date;
}): ChatMessage {
  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role.toLowerCase() as ChatMessage['role'],
    content: message.content,
    citations: (message.citations as ChatCitation[]) ?? [],
    tokenUsage: message.tokenUsage as ChatMessage['tokenUsage'],
    createdAt: message.createdAt.toISOString(),
  };
}

function mapSession(session: {
  id: string;
  userId: string;
  workspaceId: string;
  meetingId: string | null;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ChatSession {
  return {
    id: session.id,
    userId: session.userId,
    workspaceId: session.workspaceId,
    meetingId: session.meetingId ?? undefined,
    title: session.title ?? undefined,
    scope: session.meetingId ? 'meeting' : 'workspace',
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

export class ChatService {
  async getOrCreateSession(
    userId: string,
    workspaceId: string,
    options: { sessionId?: string; meetingId?: string; title?: string },
  ) {
    if (options.sessionId) {
      const existing = await chatRepository.findSessionForUser(
        options.sessionId,
        userId,
        workspaceId,
      );
      if (!existing) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Chat session not found');
      }
      return existing;
    }

    if (options.meetingId) {
      const meeting = await chatRepository.verifyMeetingInWorkspace(
        workspaceId,
        options.meetingId,
      );
      if (!meeting) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Meeting not found');
      }

      const existing = await chatRepository.findMeetingSession(
        userId,
        workspaceId,
        options.meetingId,
      );
      if (existing) {
        return existing;
      }

      return chatRepository.createSession({
        workspaceId,
        userId,
        meetingId: options.meetingId,
        title: meeting.title,
      });
    }

    return chatRepository.createSession({
      workspaceId,
      userId,
      title: options.title,
    });
  }

  async listWorkspaceSessions(userId: string, workspaceId: string): Promise<ChatSession[]> {
    const sessions = await chatRepository.listWorkspaceSessions(userId, workspaceId);
    return sessions.map(mapSession);
  }

  async getSessionMessages(
    userId: string,
    workspaceId: string,
    sessionId: string,
  ): Promise<ChatMessage[]> {
    const session = await chatRepository.findSessionForUser(sessionId, userId, workspaceId);
    if (!session) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Chat session not found');
    }

    const messages = await chatRepository.listMessages(sessionId);
    return messages.map(mapMessage);
  }

  async getMeetingMessages(
    userId: string,
    workspaceId: string,
    meetingId: string,
  ): Promise<ChatMessage[]> {
    const meeting = await chatRepository.verifyMeetingInWorkspace(workspaceId, meetingId);
    if (!meeting) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Meeting not found');
    }

    const session = await chatRepository.findMeetingSession(userId, workspaceId, meetingId);
    if (!session) {
      return [];
    }

    const messages = await chatRepository.listMessages(session.id);
    return messages.map(mapMessage);
  }

  async clearSession(userId: string, workspaceId: string, sessionId: string): Promise<void> {
    await chatRepository.softDeleteSession(sessionId, userId, workspaceId);
    await conversationMemoryService.clearSession(workspaceId, sessionId);
  }

  private async loadHistory(sessionId: string): Promise<Array<{ role: string; content: string }>> {
    const messages = await chatRepository.listMessages(sessionId, HISTORY_LIMIT);
    return messages
      .filter(
        (message: { role: ChatRole; content: string }) =>
          message.role === ChatRole.USER || message.role === ChatRole.ASSISTANT,
      )
      .map((message: { role: ChatRole; content: string }) => ({
        role: message.role.toLowerCase(),
        content: message.content,
      }));
  }

  async sendMessage(
    userId: string,
    workspaceId: string,
    dto: SendChatMessageDto,
    meetingId?: string,
  ) {
    const session = await this.getOrCreateSession(userId, workspaceId, {
      sessionId: dto.sessionId,
      meetingId: meetingId ?? dto.meetingId,
      title: dto.message.slice(0, 120),
    });

    const history = await this.loadHistory(session.id);

    await chatRepository.createMessage({
      sessionId: session.id,
      userId,
      role: ChatRole.USER,
      content: dto.message,
    });

    const correlationId = buildChatCorrelationId();
    const result = await chatAgent.runTurn(
      {
        userMessage: dto.message,
        workspaceId,
        meetingId: session.meetingId ?? undefined,
        sessionId: session.id,
        messageCount: history.length + 1,
        chatHistory: history,
      },
      correlationId,
    );

    const citations: ChatCitation[] = result.citations.map((citation) => ({
      index: citation.index,
      chunkId: citation.chunkId,
      meetingId: citation.meetingId,
      meetingTitle: citation.meetingTitle,
      excerpt: citation.excerpt,
    }));

    const assistantMessage = await chatRepository.createMessage({
      sessionId: session.id,
      role: ChatRole.ASSISTANT,
      content: result.content,
      citations,
      tokenUsage: {
        prompt: result.promptTokens,
        completion: result.completionTokens,
      },
    });

    await chatRepository.touchSession(session.id);

    await conversationMemoryService.recordTurn({
      workspaceId,
      sessionId: session.id,
      messageCount: history.length + 2,
      history: [
        ...history.map((message) => ({
          role: message.role as 'user' | 'assistant',
          content: message.content,
        })),
        { role: 'user' as const, content: dto.message },
        { role: 'assistant' as const, content: result.content },
      ],
    });

    return {
      sessionId: session.id,
      messageId: assistantMessage.id,
      reply: result.content,
      citations,
      tokenUsage: {
        prompt: result.promptTokens,
        completion: result.completionTokens,
      },
    };
  }

  async *streamMessage(
    userId: string,
    workspaceId: string,
    dto: SendChatMessageDto,
    meetingId?: string,
    options: ChatStreamOptions = {},
  ): AsyncGenerator<StreamEvent> {
    try {
      const session = await this.getOrCreateSession(userId, workspaceId, {
        sessionId: dto.sessionId,
        meetingId: meetingId ?? dto.meetingId,
        title: dto.message.slice(0, 120),
      });

      const history = await this.loadHistory(session.id);

      await chatRepository.createMessage({
        sessionId: session.id,
        userId,
        role: ChatRole.USER,
        content: dto.message,
      });

      const correlationId = buildChatCorrelationId();
      const input = {
        userMessage: dto.message,
        workspaceId,
        meetingId: session.meetingId ?? undefined,
        sessionId: session.id,
        messageCount: history.length + 1,
        chatHistory: history,
      };

      let finalContent = '';
      let promptTokens = 0;
      let completionTokens = 0;
      let citations: ChatCitation[] = [];

      for await (const event of chatAgent.streamTurn(input, correlationId, options)) {
        if (options.signal?.aborted) {
          yield {
            type: 'error',
            data: {
              code: 'STREAM_CANCELLED',
              message: 'Client disconnected',
            },
          };
          return;
        }

        if (event.type === 'token') {
          yield { type: 'token', data: { content: event.content } };
        }

        if (event.type === 'done') {
          finalContent = event.content;
          promptTokens = event.promptTokens;
          completionTokens = event.completionTokens;
          citations = event.citations.map((citation) => ({
            index: citation.index,
            chunkId: citation.chunkId,
            meetingId: citation.meetingId,
            meetingTitle: citation.meetingTitle,
            excerpt: citation.excerpt,
          }));
        }
      }

      const assistantMessage = await chatRepository.createMessage({
        sessionId: session.id,
        role: ChatRole.ASSISTANT,
        content: finalContent,
        citations,
        tokenUsage: { prompt: promptTokens, completion: completionTokens },
      });

      await chatRepository.touchSession(session.id);

      await conversationMemoryService.recordTurn({
        workspaceId,
        sessionId: session.id,
        messageCount: history.length + 2,
        history: [
          ...history.map((message) => ({
            role: message.role as 'user' | 'assistant',
            content: message.content,
          })),
          { role: 'user' as const, content: dto.message },
          { role: 'assistant' as const, content: finalContent },
        ],
      });

      for (const citation of citations) {
        yield { type: 'citation', data: citation as unknown as Record<string, unknown> };
      }

      yield {
        type: 'done',
        data: {
          sessionId: session.id,
          messageId: assistantMessage.id,
          tokenUsage: { prompt: promptTokens, completion: completionTokens },
        },
      };
    } catch (error) {
      if (isStreamCancelled(error) || options.signal?.aborted) {
        yield {
          type: 'error',
          data: {
            code: 'STREAM_CANCELLED',
            message: 'Client disconnected',
          },
        };
        return;
      }

      const message = error instanceof Error ? error.message : 'Chat streaming failed';
      yield {
        type: 'error',
        data: {
          code: 'CHAT_ERROR',
          message,
        },
      };
    }
  }
}

export const chatService = new ChatService();
