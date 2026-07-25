import fs from 'fs';
import OpenAI from 'openai';
import { env } from '../../../config/env';
import type { ITranscriptionProvider } from './transcription-provider.interface';
import type { TranscriptionInput, TranscriptionResult } from '../types/transcription.types';
import { AppError, ErrorCodes } from '../../../utils/errors';

export class OpenAITranscriptionProvider implements ITranscriptionProvider {
  readonly id = 'openai';
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!env.OPENAI_API_KEY) {
      throw new AppError(
        503,
        ErrorCodes.INTERNAL_ERROR,
        'OpenAI API key is not configured for transcription',
      );
    }
    if (!this.client) {
      this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
    return this.client;
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const client = this.getClient();
    const mode = input.mode ?? 'translate_to_english';
    const file = fs.createReadStream(input.filePath);

    if (mode === 'transcribe_original') {
      const transcription = await client.audio.transcriptions.create({
        file,
        model: env.OPENAI_WHISPER_MODEL,
      });
      return {
        text: transcription.text,
        provider: 'openai',
        model: env.OPENAI_WHISPER_MODEL,
        mode,
      };
    }

    // Default product path: Bengali+English → English (Whisper translations)
    const translation = await client.audio.translations.create({
      file,
      model: env.OPENAI_WHISPER_MODEL,
    });

    return {
      text: translation.text,
      provider: 'openai',
      model: env.OPENAI_WHISPER_MODEL,
      mode: 'translate_to_english',
    };
  }
}

export const openaiTranscriptionProvider = new OpenAITranscriptionProvider();
