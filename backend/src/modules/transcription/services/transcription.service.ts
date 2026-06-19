import { env } from '../../../config/env';
import { mockTranscriptionProvider } from '../providers/mock-transcription.provider';
import { openaiTranscriptionProvider } from '../providers/openai-transcription.provider';
import type { ITranscriptionProvider } from '../providers/transcription-provider.interface';
import type {
  TranscriptionInput,
  TranscriptionProviderId,
  TranscriptionResult,
} from '../types/transcription.types';

function resolveProviderId(): TranscriptionProviderId {
  if (env.AI_USE_MOCK || env.TRANSCRIPTION_PROVIDER === 'mock') {
    return 'mock';
  }
  return env.TRANSCRIPTION_PROVIDER;
}

export class TranscriptionService {
  private getProvider(): ITranscriptionProvider {
    const id = resolveProviderId();
    if (id === 'mock') {
      return mockTranscriptionProvider;
    }
    return openaiTranscriptionProvider;
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    return this.getProvider().transcribe(input);
  }
}

export const transcriptionService = new TranscriptionService();
