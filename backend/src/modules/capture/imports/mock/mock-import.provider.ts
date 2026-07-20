import { MeetingSource, MeetingImportProvider } from '@prisma/client';
import type { IMeetingImportProvider } from '../import-provider.interface';
import type { NormalizedCapturePayload } from '../../types/capture.types';
import { MIN_TRANSCRIPT_CHARS } from '../../../meetings/meeting.dto';

const MOCK_IMPORT_TRANSCRIPT = [
  'Alex: Thanks everyone for joining the product sync.',
  'Jordan: We agreed to ship the capture layer with audio upload first.',
  'Alex: Calendar sync will auto-create meeting stubs; Zoom import comes next.',
  'Jordan: Action item — document the import adapter contracts this week.',
].join(' ');

function ensureLength(text: string): string {
  const trimmed = text.normalize('NFC').trim();
  if (trimmed.length >= MIN_TRANSCRIPT_CHARS) {
    return trimmed;
  }
  return `${trimmed} ${MOCK_IMPORT_TRANSCRIPT}`.trim();
}

export class MockMeetingImportProvider implements IMeetingImportProvider {
  readonly id = 'mock' as const;

  async importRecording(input: {
    workspaceId: string;
    externalMeetingId?: string;
    externalRecordingId?: string;
    title?: string;
    meetingDate?: Date;
    transcriptText?: string;
    vttContent?: string;
  }): Promise<NormalizedCapturePayload> {
    const raw = input.vttContent ?? input.transcriptText ?? MOCK_IMPORT_TRANSCRIPT;
    const transcriptText = ensureLength(raw);
    const sourceFormat = input.vttContent ? 'vtt' : 'text';

    return {
      title: input.title ?? 'Imported meeting (mock)',
      meetingDate: input.meetingDate ?? new Date(),
      attendees: ['Alex', 'Jordan'],
      agenda: 'Mock platform import for capture-layer development',
      transcriptText,
      sourceFormat,
      meetingSource: MeetingSource.ZOOM_IMPORT,
      importProvider: MeetingImportProvider.ZOOM,
      externalMeetingId: input.externalMeetingId ?? 'mock-meeting-1',
      externalRecordingId: input.externalRecordingId ?? 'mock-recording-1',
      metadata: { provider: 'mock', workspaceId: input.workspaceId },
    };
  }
}

export const mockMeetingImportProvider = new MockMeetingImportProvider();
