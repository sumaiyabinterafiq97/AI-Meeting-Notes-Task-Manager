import type { TranscriptionInput, TranscriptionResult } from '../types/transcription.types';

export interface ITranscriptionProvider {
  readonly id: string;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}
