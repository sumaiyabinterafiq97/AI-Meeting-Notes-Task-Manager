import type { NormalizedCapturePayload } from '../../types/capture.types';

/**
 * Provider-agnostic meeting platform import (Zoom / Meet / Teams cloud recordings & transcripts).
 * Domain services call this interface only — never Zoom/Meet/Teams SDKs directly.
 */
export interface IMeetingImportProvider {
  readonly id: 'zoom' | 'google-meet' | 'teams' | 'mock';

  /**
   * Normalize an inbound import request into a capture payload.
   * Real providers fetch remote recordings/transcripts; mock synthesizes fixtures.
   */
  importRecording(input: {
    workspaceId: string;
    externalMeetingId?: string;
    externalRecordingId?: string;
    title?: string;
    meetingDate?: Date;
    transcriptText?: string;
    vttContent?: string;
  }): Promise<NormalizedCapturePayload>;
}
