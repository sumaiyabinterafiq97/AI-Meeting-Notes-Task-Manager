import { prisma } from '../../config/database';
import { KnowledgeEntityType, Prisma } from '@prisma/client';

export class KnowledgeRepository {
  async findByTitle(
    workspaceId: string,
    entityType: KnowledgeEntityType,
    title: string,
  ) {
    return prisma.knowledgeEntry.findFirst({
      where: {
        workspaceId,
        entityType,
        title,
        deletedAt: null,
      },
    });
  }

  async upsertEntry(data: {
    workspaceId: string;
    sourceMeetingId: string;
    entityType: KnowledgeEntityType;
    title: string;
    content: string;
    confidence: number;
    metadata?: Record<string, unknown>;
  }) {
    const existing = await this.findByTitle(data.workspaceId, data.entityType, data.title);

    if (existing) {
      return prisma.knowledgeEntry.update({
        where: { id: existing.id },
        data: {
          content: data.content,
          confidence: data.confidence,
          sourceMeetingId: data.sourceMeetingId,
          metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
    }

    return prisma.knowledgeEntry.create({
      data: {
        workspaceId: data.workspaceId,
        sourceMeetingId: data.sourceMeetingId,
        entityType: data.entityType,
        title: data.title,
        content: data.content,
        confidence: data.confidence,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async listByWorkspace(workspaceId: string, limit = 50, entityType?: KnowledgeEntityType) {
    return prisma.knowledgeEntry.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        ...(entityType && { entityType }),
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  async findById(workspaceId: string, entryId: string) {
    return prisma.knowledgeEntry.findFirst({
      where: { id: entryId, workspaceId, deletedAt: null },
    });
  }

  async listByMeeting(workspaceId: string, meetingId: string) {
    return prisma.knowledgeEntry.findMany({
      where: {
        workspaceId,
        sourceMeetingId: meetingId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const knowledgeRepository = new KnowledgeRepository();
