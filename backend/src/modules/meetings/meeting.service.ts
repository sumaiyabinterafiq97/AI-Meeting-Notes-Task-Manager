import { MeetingStatus, WorkspaceRole, MeetingSource } from '@prisma/client';
import {
  CreateMeetingDto,
  UpdateMeetingDto,
  UploadTranscriptDto,
  MeetingDto,
  MeetingListQuery,
  TranscriptResponseDto,
  ReprocessResponseDto,
  DeleteMeetingContext,
  MAX_TRANSCRIPT_BYTES,
  MIN_TRANSCRIPT_CHARS,
} from './meeting.dto';
import { meetingRepository } from './meeting.repository';
import { aiJobService } from '../ai';
import { logActivity } from '../../lib/activity-log';
import { AppError, ErrorCodes } from '../../utils/errors';
import { parsePagination, buildPaginationMeta } from '../../lib/pagination';

function toMeetingDto(meeting: {
  id: string;
  workspaceId: string;
  title: string;
  meetingDate: Date;
  durationMinutes: number | null;
  attendees: unknown;
  tags: string[];
  agenda: string | null;
  status: MeetingStatus;
  source?: MeetingSource;
  createdById: string;
  createdAt: Date;
  updatedAt?: Date;
}): MeetingDto {
  return {
    id: meeting.id,
    workspaceId: meeting.workspaceId,
    title: meeting.title,
    meetingDate: meeting.meetingDate,
    durationMinutes: meeting.durationMinutes,
    attendees: Array.isArray(meeting.attendees)
      ? (meeting.attendees as string[])
      : [],
    tags: meeting.tags,
    agenda: meeting.agenda,
    status: meeting.status,
    createdById: meeting.createdById,
    createdAt: meeting.createdAt,
    ...(meeting.source && { source: meeting.source }),
    ...(meeting.updatedAt && { updatedAt: meeting.updatedAt }),
  };
}

function parseMeetingDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid meetingDate format');
  }
  return date;
}

export class MeetingService {
  async createMeeting(
    workspaceId: string,
    userId: string,
    data: CreateMeetingDto,
  ): Promise<MeetingDto> {
    const meeting = await meetingRepository.createMeeting({
      workspaceId,
      createdById: userId,
      title: data.title.trim(),
      meetingDate: parseMeetingDate(data.meetingDate),
      durationMinutes: data.durationMinutes,
      attendees: data.attendees,
      tags: data.tags,
      agenda: data.agenda?.trim(),
    });

    await logActivity({
      workspaceId,
      actorId: userId,
      action: 'meeting.created',
      entityType: 'meeting',
      entityId: meeting.id,
      metadata: { title: meeting.title },
    });

    return toMeetingDto(meeting);
  }

  async listMeetings(workspaceId: string, query: MeetingListQuery) {
    const pagination = parsePagination(query);

    const filters = {
      status: query.status,
      from: query.from ? parseMeetingDate(query.from) : undefined,
      to: query.to ? parseMeetingDate(query.to) : undefined,
      tag: query.tag,
      search: query.search?.trim(),
    };

    const { items, total } = await meetingRepository.listMeetings(
      workspaceId,
      pagination,
      filters,
    );

    return {
      data: items.map(toMeetingDto),
      meta: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async getMeeting(workspaceId: string, meetingId: string) {
    const meeting = await meetingRepository.findMeetingInWorkspace(workspaceId, meetingId);
    if (!meeting) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Meeting not found');
    }

    return {
      ...toMeetingDto(meeting),
      transcript: meeting.transcript
        ? {
            id: meeting.transcript.id,
            sourceFormat: meeting.transcript.sourceFormat,
            charCount: meeting.transcript.charCount,
            uploadedAt: meeting.transcript.uploadedAt,
          }
        : null,
      aiOutput: meeting.aiOutput,
      actionItems: meeting.actionItems,
      linkedTasks: meeting.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
      })),
    };
  }

  async updateMeeting(
    workspaceId: string,
    meetingId: string,
    data: UpdateMeetingDto,
  ): Promise<MeetingDto> {
    const existing = await meetingRepository.findMeetingInWorkspace(workspaceId, meetingId);
    if (!existing) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Meeting not found');
    }

    if (existing.status === MeetingStatus.PROCESSING) {
      throw new AppError(409, ErrorCodes.CONFLICT, 'Meeting is currently processing');
    }

    if (existing.status === MeetingStatus.TRANSCRIBING) {
      throw new AppError(409, ErrorCodes.CONFLICT, 'Meeting is currently transcribing');
    }

    const updated = await meetingRepository.updateMeeting(workspaceId, meetingId, {
      ...(data.title !== undefined && { title: data.title.trim() }),
      ...(data.meetingDate !== undefined && {
        meetingDate: parseMeetingDate(data.meetingDate),
      }),
      ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
      ...(data.attendees !== undefined && { attendees: data.attendees }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.agenda !== undefined && { agenda: data.agenda?.trim() ?? null }),
    });

    return toMeetingDto(updated);
  }

  async deleteMeeting(
    workspaceId: string,
    meetingId: string,
    context: DeleteMeetingContext,
  ): Promise<void> {
    const meeting = await meetingRepository.findMeetingInWorkspace(workspaceId, meetingId);
    if (!meeting) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Meeting not found');
    }

    const isCreator = meeting.createdById === context.userId;
    const isOwner = context.role === WorkspaceRole.OWNER;

    if (!isCreator && !isOwner) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Meeting not found');
    }

    await meetingRepository.softDeleteMeeting(workspaceId, meetingId);

    await logActivity({
      workspaceId,
      actorId: context.userId,
      action: 'meeting.deleted',
      entityType: 'meeting',
      entityId: meetingId,
      metadata: { title: meeting.title },
    });
  }

  async uploadTranscript(
    workspaceId: string,
    meetingId: string,
    data: UploadTranscriptDto,
  ): Promise<TranscriptResponseDto> {
    const meeting = await meetingRepository.findMeetingInWorkspace(workspaceId, meetingId);
    if (!meeting) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Meeting not found');
    }

    if (meeting.status === MeetingStatus.PROCESSING) {
      throw new AppError(409, ErrorCodes.CONFLICT, 'Meeting is already processing');
    }

    if (meeting.status === MeetingStatus.TRANSCRIBING) {
      throw new AppError(409, ErrorCodes.CONFLICT, 'Meeting is currently transcribing');
    }

    const content = data.content.normalize('NFC');
    const charCount = content.length;
    const byteLength = Buffer.byteLength(content, 'utf8');

    if (charCount < MIN_TRANSCRIPT_CHARS) {
      throw new AppError(
        400,
        ErrorCodes.VALIDATION_ERROR,
        `Transcript must be at least ${MIN_TRANSCRIPT_CHARS} characters`,
      );
    }

    if (byteLength > MAX_TRANSCRIPT_BYTES) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Transcript exceeds 5MB limit');
    }

    const result = await meetingRepository.upsertTranscriptAndStartProcessing(meetingId, {
      content,
      sourceFormat: data.sourceFormat,
      charCount,
    });

    await aiJobService.enqueueProcessing(workspaceId, meetingId, {
      idempotencyKey: `meeting:${meetingId}:transcript`,
    });

    const refreshed = await meetingRepository.findMeetingInWorkspace(workspaceId, meetingId);

    return {
      meetingId,
      status: refreshed!.status,
      charCount: result.transcript.charCount,
    };
  }

  async reprocessMeeting(
    workspaceId: string,
    meetingId: string,
  ): Promise<ReprocessResponseDto> {
    const meeting = await meetingRepository.findMeetingInWorkspace(workspaceId, meetingId);
    if (!meeting) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Meeting not found');
    }

    if (meeting.status === MeetingStatus.PROCESSING) {
      throw new AppError(409, ErrorCodes.CONFLICT, 'Meeting is already processing');
    }

    if (meeting.status === MeetingStatus.TRANSCRIBING) {
      throw new AppError(409, ErrorCodes.CONFLICT, 'Meeting is currently transcribing');
    }

    const hasTranscript = await meetingRepository.hasTranscript(meetingId);
    if (!hasTranscript) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Meeting has no transcript');
    }

    await meetingRepository.markMeetingProcessing(meetingId);

    await aiJobService.enqueueProcessing(workspaceId, meetingId, {
      force: true,
      idempotencyKey: `meeting:${meetingId}:reprocess:${Date.now()}`,
    });

    const refreshed = await meetingRepository.findMeetingInWorkspace(workspaceId, meetingId);

    return { status: refreshed!.status };
  }
}

export const meetingService = new MeetingService();
