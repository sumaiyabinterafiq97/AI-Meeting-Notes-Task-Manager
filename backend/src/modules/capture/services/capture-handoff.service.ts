import { MeetingImportStatus, type MeetingSource, Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { meetingRepository } from '../../meetings/meeting.repository';
import { aiJobService } from '../../ai';
import { logActivity } from '../../../lib/activity-log';
import { AppError, ErrorCodes } from '../../../utils/errors';
import { MIN_TRANSCRIPT_CHARS } from '../../meetings/meeting.dto';
import { metricsService } from '../../observability/metrics/metrics.service';
import { structuredLogger } from '../../observability/logging/structured-logger';
import type {
  ImportMeetingRequest,
  ImportMeetingResponse,
  MeetingNeedingTranscriptDto,
  NormalizedCapturePayload,
} from '../types/capture.types';
import { zoomImportProvider } from '../imports/zoom/zoom-import.provider';
import { googleMeetImportProvider } from '../imports/google-meet/google-meet-import.provider';
import { teamsImportProvider } from '../imports/teams/teams-import.provider';
import type { IMeetingImportProvider } from '../imports/import-provider.interface';

function providerFor(route: 'zoom' | 'google-meet' | 'teams'): IMeetingImportProvider {
  if (route === 'zoom') return zoomImportProvider;
  if (route === 'google-meet') return googleMeetImportProvider;
  return teamsImportProvider;
}

/**
 * Capture handoff: normalized transcript → meeting_transcripts → existing AI pipeline.
 */
export class CaptureHandoffService {
  async importFromProvider(
    workspaceId: string,
    userId: string,
    route: 'zoom' | 'google-meet' | 'teams',
    body: ImportMeetingRequest,
  ): Promise<ImportMeetingResponse> {
    const startedAt = Date.now();
    const provider = providerFor(route);

    const payload = await provider.importRecording({
      workspaceId,
      externalMeetingId: body.externalMeetingId,
      externalRecordingId: body.externalRecordingId,
      title: body.title,
      meetingDate: body.meetingDate ? new Date(body.meetingDate) : undefined,
      transcriptText: body.transcriptText,
      vttContent: body.vttContent,
    });

    const result = await this.persistAndEnqueue(workspaceId, userId, payload);

    metricsService.recordLatency('capture.import.duration', Date.now() - startedAt, {
      workspaceId,
      provider: route,
      status: 'success',
      jobType: 'meeting-import',
    });

    return result;
  }

  async persistAndEnqueue(
    workspaceId: string,
    userId: string,
    payload: NormalizedCapturePayload,
  ): Promise<ImportMeetingResponse> {
    if (payload.transcriptText.length < MIN_TRANSCRIPT_CHARS) {
      throw new AppError(
        400,
        ErrorCodes.VALIDATION_ERROR,
        `Transcript must be at least ${MIN_TRANSCRIPT_CHARS} characters`,
      );
    }

    const meeting = await prisma.meeting.create({
      data: {
        workspaceId,
        createdById: userId,
        title: payload.title.slice(0, 200),
        meetingDate: payload.meetingDate,
        durationMinutes: payload.durationMinutes,
        attendees: payload.attendees ?? [],
        agenda: payload.agenda ?? undefined,
        source: payload.meetingSource,
      },
    });

    await meetingRepository.upsertTranscriptAndStartProcessing(meeting.id, {
      content: payload.transcriptText,
      sourceFormat: payload.sourceFormat,
      charCount: payload.transcriptText.length,
    });

    const meetingImport = await prisma.meetingImport.create({
      data: {
        workspaceId,
        meetingId: meeting.id,
        provider: payload.importProvider,
        externalMeetingId: payload.externalMeetingId,
        externalRecordingId: payload.externalRecordingId,
        status: MeetingImportStatus.IMPORTED,
        metadata: (payload.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    await aiJobService.enqueueProcessing(workspaceId, meeting.id, {
      idempotencyKey: `meeting:${meeting.id}:import:${payload.importProvider}`,
      force: true,
    });

    await logActivity({
      workspaceId,
      actorId: userId,
      action: 'meeting.imported',
      entityType: 'meeting',
      entityId: meeting.id,
      metadata: {
        provider: payload.importProvider,
        importId: meetingImport.id,
        charCount: payload.transcriptText.length,
      },
    });

    structuredLogger.info(
      {
        component: 'capture.import',
        workspaceId,
        meetingId: meeting.id,
        provider: payload.importProvider,
        charCount: payload.transcriptText.length,
      },
      'meeting imported and AI pipeline enqueued',
    );

    const refreshed = await meetingRepository.findMeetingInWorkspace(workspaceId, meeting.id);

    return {
      meetingId: meeting.id,
      importId: meetingImport.id,
      provider: payload.importProvider,
      status: meetingImport.status,
      meetingStatus: refreshed?.status ?? 'PROCESSING',
      charCount: payload.transcriptText.length,
    };
  }

  async listNeedingTranscript(workspaceId: string): Promise<MeetingNeedingTranscriptDto[]> {
    const meetings = await prisma.meeting.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        status: 'DRAFT',
        transcript: null,
        OR: [
          { source: { in: ['GOOGLE_CALENDAR', 'MICROSOFT_CALENDAR'] satisfies MeetingSource[] } },
          { externalCalendarEventId: { not: null } },
        ],
      },
      orderBy: { meetingDate: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        meetingDate: true,
        status: true,
        source: true,
        externalCalendarEventId: true,
      },
    });

    return meetings;
  }
}

export const captureHandoffService = new CaptureHandoffService();
