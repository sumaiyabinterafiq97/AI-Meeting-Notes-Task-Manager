import type { ITranscriptionProvider } from './transcription-provider.interface';
import type { TranscriptionInput, TranscriptionResult } from '../types/transcription.types';

/** Realistic stand-in transcript for dev/test (≥ 100 chars). */
export const MOCK_TRANSCRIPTION_TEXT = [
  'Alex: Welcome everyone to sprint planning.',
  'Jordan: We need to finalize the API design and ship the transcription pipeline.',
  'Alex: Agreed. Let us assign owners for the audio upload endpoint and Whisper integration.',
  'Jordan: I will take the backend job queue work; Alex can handle the status API.',
  'Alex: Sounds good. We should have a working demo by end of week.',
].join(' ');

export class MockTranscriptionProvider implements ITranscriptionProvider {
  readonly id = 'mock';

  async transcribe(_input: TranscriptionInput): Promise<TranscriptionResult> {
    return {
      text: MOCK_TRANSCRIPTION_TEXT,
      provider: 'mock',
      model: 'mock-whisper',
    };
  }
}

export const mockTranscriptionProvider = new MockTranscriptionProvider();
