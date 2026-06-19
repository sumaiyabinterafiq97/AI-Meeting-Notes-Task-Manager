import { ChatRole, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';
import type { ChatCitation } from './types/chat.types';

export class ChatRepository {
  async findSessionForUser(sessionId: string, userId: string, workspaceId: string) {
    return prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId,
        workspaceId,
        deletedAt: null,
      },
    });
  }

  async findMeetingSession(userId: string, workspaceId: string, meetingId: string) {
    return prisma.chatSession.findFirst({
      where: {
        userId,
        workspaceId,
        meetingId,
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createSession(data: {
    workspaceId: string;
    userId: string;
    meetingId?: string;
    title?: string;
  }) {
    return prisma.chatSession.create({
      data: {
        workspaceId: data.workspaceId,
        userId: data.userId,
        meetingId: data.meetingId,
        title: data.title,
      },
    });
  }

  async touchSession(sessionId: string) {
    return prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });
  }

  async listWorkspaceSessions(userId: string, workspaceId: string) {
    return prisma.chatSession.findMany({
      where: {
        userId,
        workspaceId,
        meetingId: null,
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  async softDeleteSession(sessionId: string, userId: string, workspaceId: string) {
    const session = await this.findSessionForUser(sessionId, userId, workspaceId);
    if (!session) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Chat session not found');
    }

    await prisma.$transaction([
      prisma.chatMessage.updateMany({
        where: { sessionId },
        data: { deletedAt: new Date() },
      }),
      prisma.chatSession.update({
        where: { id: sessionId },
        data: { deletedAt: new Date() },
      }),
    ]);
  }

  async listMessages(sessionId: string, limit = 50) {
    return prisma.chatMessage.findMany({
      where: {
        sessionId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async createMessage(data: {
    sessionId: string;
    userId?: string;
    role: ChatRole;
    content: string;
    citations?: ChatCitation[];
    tokenUsage?: { prompt: number; completion: number };
  }) {
    return prisma.chatMessage.create({
      data: {
        sessionId: data.sessionId,
        userId: data.userId,
        role: data.role,
        content: data.content,
        citations: (data.citations ?? []) as unknown as Prisma.InputJsonValue,
        tokenUsage: data.tokenUsage as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async verifyMeetingInWorkspace(workspaceId: string, meetingId: string) {
    return prisma.meeting.findFirst({
      where: {
        id: meetingId,
        workspaceId,
        deletedAt: null,
      },
      select: { id: true, title: true },
    });
  }
}

export const chatRepository = new ChatRepository();
