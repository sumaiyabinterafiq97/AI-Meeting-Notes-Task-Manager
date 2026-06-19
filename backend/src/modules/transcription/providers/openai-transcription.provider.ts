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
    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(input.filePath),
      model: env.OPENAI_WHISPER_MODEL,
    });

    return {
      text: transcription.text,
      provider: 'openai',
      model: env.OPENAI_WHISPER_MODEL,
    };
  }
}

export const openaiTranscriptionProvider = new OpenAITranscriptionProvider();
