import { knowledgeAgent, buildKnowledgeMessage } from '../agents/knowledge/services/knowledge.service';
import { knowledgeRepository } from './knowledge.repository';
import { knowledgeEmbeddingService } from './knowledge-embedding.service';
import { toPrismaKnowledgeEntityType } from '../agents/knowledge/types/knowledge.types';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { KnowledgeEntityType } from '@prisma/client';
import { AppError, ErrorCodes } from '../../utils/errors';

const KNOWLEDGE_ENTITY_TYPES: KnowledgeEntityType[] = [
  'PERSON',
  'PROJECT',
  'DECISION',
  'CONCEPT',
  'PROCESS',
  'OTHER',
];

export class KnowledgeExtractionService {
  async extractFromMeeting(meetingId: string, workspaceId: string, jobId?: string): Promise<number> {
    if (!env.KNOWLEDGE_EXTRACTION_ENABLED) {
      return 0;
    }

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId, deletedAt: null },
      include: { transcript: true, aiOutput: true },
    });

    if (!meeting?.transcript || !meeting.aiOutput) {
      return 0;
    }

    const decisions = Array.isArray(meeting.aiOutput.decisions)
      ? (meeting.aiOutput.decisions as Array<{ text: string; context: string }>)
      : [];

    const result = await knowledgeAgent.execute(
      buildKnowledgeMessage(
        {
          workspaceId,
          meetingId,
          transcript: meeting.transcript.content,
          summary: meeting.aiOutput.summary ?? '',
          decisions,
          jobId,
        },
        { correlationId: jobId ?? meetingId },
      ),
    );

    const entries = result.output?.entries ?? [];
    let stored = 0;

    for (const entry of entries) {
      if (entry.confidence < 0.5) {
        continue;
      }

      const saved = await knowledgeRepository.upsertEntry({
        workspaceId,
        sourceMeetingId: meetingId,
        entityType: toPrismaKnowledgeEntityType(entry.entityType),
        title: entry.title.slice(0, 300),
        content: entry.content,
        confidence: entry.confidence,
        metadata: { meetingTitle: meeting.title },
      });

      await knowledgeEmbeddingService.embedEntry(saved);
      stored += 1;
    }

    return stored;
  }

  async listEntries(workspaceId: string, entityType?: string) {
    const parsedType =
      entityType && KNOWLEDGE_ENTITY_TYPES.includes(entityType as KnowledgeEntityType)
        ? (entityType as KnowledgeEntityType)
        : undefined;

    return knowledgeRepository.listByWorkspace(workspaceId, 100, parsedType);
  }

  async getEntry(workspaceId: string, entryId: string) {
    const entry = await knowledgeRepository.findById(workspaceId, entryId);
    if (!entry) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Knowledge entry not found');
    }
    return entry;
  }
}

export const knowledgeExtractionService = new KnowledgeExtractionService();
