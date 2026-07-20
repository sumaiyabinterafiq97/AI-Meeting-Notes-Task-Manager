import type { ITranscriptionProvider } from './transcription-provider.interface';
import type { TranscriptionInput, TranscriptionResult } from '../types/transcription.types';
import { AppError, ErrorCodes } from '../../../utils/errors';

/**
 * Deepgram stub — Phase A leaves Whisper as the production provider.
 * Wire DEEPGRAM_API_KEY + SDK when enabling this path.
 */
export class DeepgramTranscriptionProvider implements ITranscriptionProvider {
  readonly id = 'deepgram';

  async transcribe(_input: TranscriptionInput): Promise<TranscriptionResult> {
    throw new AppError(
      501,
      ErrorCodes.INTERNAL_ERROR,
      'Deepgram transcription is not configured. Set TRANSCRIPTION_PROVIDER=openai or mock.',
    );
  }
}

export const deepgramTranscriptionProvider = new DeepgramTranscriptionProvider();
