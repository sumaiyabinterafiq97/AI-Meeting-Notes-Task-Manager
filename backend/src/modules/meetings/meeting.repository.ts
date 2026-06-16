import { MeetingStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { PaginationParams } from '../../lib/pagination';
import { TranscriptSourceFormat } from './meeting.dto';

export class MeetingRepository {
  async createMeeting(data: {
    workspaceId: string;
    createdById: string;
    title: string;
    meetingDate: Date;
    durationMinutes?: number;
    attendees?: string[];
    tags?: string[];
    agenda?: string;
  }) {
    return prisma.meeting.create({
      data: {
        workspaceId: data.workspaceId,
        createdById: data.createdById,
        title: data.title,
        meetingDate: data.meetingDate,
        durationMinutes: data.durationMinutes,
        attendees: data.attendees ?? [],
        tags: data.tags ?? [],
        agenda: data.agenda,
      },
    });
  }

  async findMeetingInWorkspace(workspaceId: string, meetingId: string) {
    return prisma.meeting.findFirst({
      where: {
        id: meetingId,
        workspaceId,
        deletedAt: null,
      },
      include: {
        transcript: true,
        aiOutput: true,
        actionItems: {
          orderBy: { createdAt: 'asc' },
        },
        tasks: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async listMeetings(
    workspaceId: string,
    pagination: PaginationParams,
    filters: {
      status?: MeetingStatus;
      from?: Date;
      to?: Date;
      tag?: string;
      search?: string;
    },
  ) {
    const where: Prisma.MeetingWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(filters.status && { status: filters.status }),
      ...(filters.from || filters.to
        ? {
            meetingDate: {
              ...(filters.from && { gte: filters.from }),
              ...(filters.to && { lte: filters.to }),
            },
          }
        : {}),
      ...(filters.tag && { tags: { has: filters.tag } }),
      ...(filters.search && {
        title: { contains: filters.search, mode: 'insensitive' },
      }),
    };

    const [items, total] = await prisma.$transaction([
      prisma.meeting.findMany({
        where,
        orderBy: { meetingDate: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.meeting.count({ where }),
    ]);

    return { items, total };
  }

  async updateMeeting(
    workspaceId: string,
    meetingId: string,
    data: Prisma.MeetingUpdateInput,
  ) {
    return prisma.meeting.update({
      where: {
        id: meetingId,
        workspaceId,
        deletedAt: null,
      },
      data,
    });
  }

  async softDeleteMeeting(workspaceId: string, meetingId: string) {
    return prisma.meeting.update({
      where: {
        id: meetingId,
        workspaceId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
  }

  async upsertTranscriptAndStartProcessing(
    meetingId: string,
    data: {
      content: string;
      sourceFormat: TranscriptSourceFormat;
      charCount: number;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      const transcript = await tx.meetingTranscript.upsert({
        where: { meetingId },
        create: {
          meetingId,
          content: data.content,
          sourceFormat: data.sourceFormat,
          charCount: data.charCount,
        },
        update: {
          content: data.content,
          sourceFormat: data.sourceFormat,
          charCount: data.charCount,
          uploadedAt: new Date(),
        },
      });

      await tx.meetingAiOutput.upsert({
        where: { meetingId },
        create: {
          meetingId,
          processingStatus: 'PROCESSING',
        },
        update: {
          processingStatus: 'PROCESSING',
          errorMessage: null,
        },
      });

      const meeting = await tx.meeting.update({
        where: { id: meetingId },
        data: { status: MeetingStatus.PROCESSING },
      });

      return { transcript, meeting };
    });
  }

  async markMeetingProcessing(meetingId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.meetingAiOutput.upsert({
        where: { meetingId },
        create: {
          meetingId,
          processingStatus: 'PROCESSING',
        },
        update: {
          processingStatus: 'PROCESSING',
          errorMessage: null,
        },
      });

      return tx.meeting.update({
        where: { id: meetingId },
        data: { status: MeetingStatus.PROCESSING },
      });
    });
  }

  async hasTranscript(meetingId: string): Promise<boolean> {
    const transcript = await prisma.meetingTranscript.findUnique({
      where: { meetingId },
      select: { id: true },
    });
    return Boolean(transcript);
  }
}

export const meetingRepository = new MeetingRepository();
