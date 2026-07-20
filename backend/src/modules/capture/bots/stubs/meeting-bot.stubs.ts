import { AppError, ErrorCodes } from '../../../../utils/errors';
import type {
  IMeetingBotProvider,
  MeetingBotAudioChunk,
  MeetingBotJoinOptions,
  MeetingBotTranscriptPartial,
} from '../meeting-bot.interface';

async function* emptyAudio(): AsyncIterable<MeetingBotAudioChunk> {
  // Phase D stub — no live capture yet
}

async function* emptyTranscript(): AsyncIterable<MeetingBotTranscriptPartial> {
  // Phase D stub
}

function notImplemented(provider: string): never {
  throw new AppError(
    501,
    ErrorCodes.INTERNAL_ERROR,
    `${provider} live meeting bot is not implemented (Phase D). Use audio upload or platform import adapters.`,
  );
}

function createBotStub(id: IMeetingBotProvider['id'], label: string): IMeetingBotProvider {
  return {
    id,
    async joinMeeting(_options: MeetingBotJoinOptions) {
      return notImplemented(label);
    },
    async leaveMeeting(_sessionId: string) {
      return notImplemented(label);
    },
    streamAudioChunks(_sessionId: string) {
      return emptyAudio();
    },
    produceTranscript(_sessionId: string) {
      return emptyTranscript();
    },
  };
}

export const zoomBotStub = createBotStub('zoom', 'Zoom');
export const googleMeetBotStub = createBotStub('google-meet', 'Google Meet');
export const teamsBotStub = createBotStub('teams', 'Microsoft Teams');
