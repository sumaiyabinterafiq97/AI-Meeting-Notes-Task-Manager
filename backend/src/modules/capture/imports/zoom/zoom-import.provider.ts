import { MeetingSource, MeetingImportProvider } from '@prisma/client';
import { env } from '../../../../config/env';
import { AppError, ErrorCodes } from '../../../../utils/errors';
import type { IMeetingImportProvider } from '../import-provider.interface';
import type { NormalizedCapturePayload } from '../../types/capture.types';
import { mockMeetingImportProvider } from '../mock/mock-import.provider';
import { MIN_TRANSCRIPT_CHARS } from '../../../meetings/meeting.dto';

/**
 * Zoom cloud recording / VTT import adapter.
 * Phase C: accepts client-supplied transcript/VTT; remote Zoom API fetch is future work.
 */
export class ZoomImportProvider implements IMeetingImportProvider {
  readonly id = 'zoom' as const;

  async importRecording(input: {
    workspaceId: string;
    externalMeetingId?: string;
    externalRecordingId?: string;
    title?: string;
    meetingDate?: Date;
    transcriptText?: string;
    vttContent?: string;
  }): Promise<NormalizedCapturePayload> {
    if (env.AI_USE_MOCK) {
      const mock = await mockMeetingImportProvider.importRecording(input);
      return {
        ...mock,
        meetingSource: MeetingSource.ZOOM_IMPORT,
        importProvider: MeetingImportProvider.ZOOM,
        title: input.title ?? 'Zoom import (mock)',
      };
    }

    const raw = input.vttContent ?? input.transcriptText;
    if (!raw || raw.trim().length < MIN_TRANSCRIPT_CHARS) {
      throw new AppError(
        501,
        ErrorCodes.INTERNAL_ERROR,
        'Zoom cloud API import is not configured. Provide transcriptText/vttContent, or enable AI_USE_MOCK.',
      );
    }

    return {
      title: input.title ?? 'Zoom meeting',
      meetingDate: input.meetingDate ?? new Date(),
      transcriptText: raw.normalize('NFC').trim(),
      sourceFormat: input.vttContent ? 'vtt' : 'text',
      meetingSource: MeetingSource.ZOOM_IMPORT,
      importProvider: MeetingImportProvider.ZOOM,
      externalMeetingId: input.externalMeetingId,
      externalRecordingId: input.externalRecordingId,
      metadata: { adapter: 'zoom', mode: 'client-supplied-transcript' },
    };
  }
}

export const zoomImportProvider = new ZoomImportProvider();
