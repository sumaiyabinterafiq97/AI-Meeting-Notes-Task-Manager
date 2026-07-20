import { MeetingSource, MeetingImportProvider } from '@prisma/client';
import { env } from '../../../../config/env';
import { AppError, ErrorCodes } from '../../../../utils/errors';
import type { IMeetingImportProvider } from '../import-provider.interface';
import type { NormalizedCapturePayload } from '../../types/capture.types';
import { mockMeetingImportProvider } from '../mock/mock-import.provider';
import { MIN_TRANSCRIPT_CHARS } from '../../../meetings/meeting.dto';

/**
 * Google Meet recording / Gemini notes / VTT import adapter (Phase C).
 */
export class GoogleMeetImportProvider implements IMeetingImportProvider {
  readonly id = 'google-meet' as const;

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
        meetingSource: MeetingSource.GOOGLE_MEET_IMPORT,
        importProvider: MeetingImportProvider.GOOGLE_MEET,
        title: input.title ?? 'Google Meet import (mock)',
      };
    }

    const raw = input.vttContent ?? input.transcriptText;
    if (!raw || raw.trim().length < MIN_TRANSCRIPT_CHARS) {
      throw new AppError(
        501,
        ErrorCodes.INTERNAL_ERROR,
        'Google Meet API import is not configured. Provide transcriptText/vttContent, or enable AI_USE_MOCK.',
      );
    }

    return {
      title: input.title ?? 'Google Meet',
      meetingDate: input.meetingDate ?? new Date(),
      transcriptText: raw.normalize('NFC').trim(),
      sourceFormat: input.vttContent ? 'vtt' : 'text',
      meetingSource: MeetingSource.GOOGLE_MEET_IMPORT,
      importProvider: MeetingImportProvider.GOOGLE_MEET,
      externalMeetingId: input.externalMeetingId,
      externalRecordingId: input.externalRecordingId,
      metadata: { adapter: 'google-meet', mode: 'client-supplied-transcript' },
    };
  }
}

export const googleMeetImportProvider = new GoogleMeetImportProvider();
