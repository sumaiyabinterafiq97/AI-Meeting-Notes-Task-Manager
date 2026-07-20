/**
 * Live meeting bot contract — Phase D scaffold only.
 * Do not implement Zoom/Meet/Teams bots until compliance + secrets are production-ready.
 */
export interface MeetingBotJoinOptions {
  meetingUrl: string;
  workspaceId: string;
  meetingId?: string;
  displayName?: string;
}

export interface MeetingBotAudioChunk {
  sequence: number;
  pcmOrEncoded: Buffer;
  mimeType: string;
  capturedAt: Date;
}

export interface MeetingBotTranscriptPartial {
  text: string;
  isFinal: boolean;
  speakerLabel?: string;
  capturedAt: Date;
}

export interface IMeetingBotProvider {
  readonly id: 'zoom' | 'google-meet' | 'teams';

  joinMeeting(options: MeetingBotJoinOptions): Promise<{ sessionId: string }>;

  leaveMeeting(sessionId: string): Promise<void>;

  /** Async iterable of audio chunks while joined (future). */
  streamAudioChunks(sessionId: string): AsyncIterable<MeetingBotAudioChunk>;

  /** Produce transcript segments from the live session (future). */
  produceTranscript(sessionId: string): AsyncIterable<MeetingBotTranscriptPartial>;
}
