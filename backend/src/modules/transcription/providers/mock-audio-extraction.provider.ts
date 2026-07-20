import fs from 'fs/promises';
import type {
  AudioExtractionInput,
  AudioExtractionResult,
  IAudioExtractionProvider,
} from './audio-extraction.interface';

/** Minimal PCM WAV (silence) — enough for mock Whisper / CI without ffmpeg. */
function minimalWavBuffer(): Buffer {
  const buffer = Buffer.alloc(44);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24);
  buffer.writeUInt32LE(8000, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(0, 40);
  return buffer;
}

/**
 * Mock extractor for AI_USE_MOCK / CI when ffmpeg is unavailable.
 * Does not read or log video bytes — writes a tiny stand-in WAV.
 */
export class MockAudioExtractionProvider implements IAudioExtractionProvider {
  readonly id = 'mock' as const;

  async extract(input: AudioExtractionInput): Promise<AudioExtractionResult> {
    const startedAt = Date.now();
    await fs.writeFile(input.outputPath, minimalWavBuffer());
    return {
      outputPath: input.outputPath,
      mimeType: 'audio/wav',
      extension: '.wav',
      provider: 'mock',
      durationMs: Date.now() - startedAt,
    };
  }
}

export const mockAudioExtractionProvider = new MockAudioExtractionProvider();
