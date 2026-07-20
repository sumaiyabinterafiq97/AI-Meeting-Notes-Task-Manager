export interface AudioExtractionInput {
  /** Absolute path to source video (or media) file */
  inputPath: string;
  /** Absolute path for extracted audio output (e.g. .wav / .mp3) */
  outputPath: string;
  mimeType: string;
  originalName: string;
}

export interface AudioExtractionResult {
  outputPath: string;
  mimeType: string;
  extension: '.wav' | '.mp3';
  provider: 'mock' | 'ffmpeg';
  durationMs: number;
}

/**
 * Provider-agnostic video → audio extraction.
 * Domain code never shells out to ffmpeg directly.
 */
export interface IAudioExtractionProvider {
  readonly id: 'mock' | 'ffmpeg';
  extract(input: AudioExtractionInput): Promise<AudioExtractionResult>;
}
