import { spawn } from 'child_process';
import fs from 'fs/promises';
import { env } from '../../../config/env';
import { AppError, ErrorCodes } from '../../../utils/errors';
import type {
  AudioExtractionInput,
  AudioExtractionResult,
  IAudioExtractionProvider,
} from './audio-extraction.interface';

/**
 * ffmpeg-based audio extraction (mp4/webm → wav).
 * Never logs media paths' file contents.
 */
export class FfmpegAudioExtractionProvider implements IAudioExtractionProvider {
  readonly id = 'ffmpeg' as const;

  async extract(input: AudioExtractionInput): Promise<AudioExtractionResult> {
    const startedAt = Date.now();
    const ffmpegBin = env.FFMPEG_PATH;

    await new Promise<void>((resolve, reject) => {
      const args = [
        '-y',
        '-i',
        input.inputPath,
        '-vn',
        '-acodec',
        'pcm_s16le',
        '-ar',
        '16000',
        '-ac',
        '1',
        input.outputPath,
      ];

      const child = spawn(ffmpegBin, args, {
        stdio: ['ignore', 'ignore', 'pipe'],
      });

      let stderrTail = '';
      child.stderr?.on('data', (chunk: Buffer) => {
        // Keep a short tail for error messages only — never full media dumps
        stderrTail = (stderrTail + chunk.toString('utf8')).slice(-800);
      });

      child.on('error', (err) => {
        reject(
          new AppError(
            503,
            ErrorCodes.INTERNAL_ERROR,
            `ffmpeg is not available (${err.message}). Install ffmpeg or set AUDIO_EXTRACT_PROVIDER=mock.`,
          ),
        );
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(
          new AppError(
            400,
            ErrorCodes.VALIDATION_ERROR,
            `Failed to extract audio from video (ffmpeg exit ${code}). Ensure the file has an audio track.`,
          ),
        );
      });
    });

    try {
      const stat = await fs.stat(input.outputPath);
      if (stat.size <= 0) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Extracted audio file is empty');
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        400,
        ErrorCodes.VALIDATION_ERROR,
        'Audio extraction produced no output file',
      );
    }

    return {
      outputPath: input.outputPath,
      mimeType: 'audio/wav',
      extension: '.wav',
      provider: 'ffmpeg',
      durationMs: Date.now() - startedAt,
    };
  }
}

export const ffmpegAudioExtractionProvider = new FfmpegAudioExtractionProvider();
