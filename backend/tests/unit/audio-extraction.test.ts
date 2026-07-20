import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { mockAudioExtractionProvider } from '../../src/modules/transcription/providers/mock-audio-extraction.provider';
import { ffmpegAudioExtractionProvider } from '../../src/modules/transcription/providers/ffmpeg-audio-extraction.provider';
import { AppError } from '../../src/utils/errors';

describe('Audio extraction providers', () => {
  it('mock extractor writes a wav without reading media contents', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mm-extract-'));
    const outputPath = path.join(dir, 'out.wav');

    const result = await mockAudioExtractionProvider.extract({
      inputPath: path.join(dir, 'missing-input.mp4'),
      outputPath,
      mimeType: 'video/mp4',
      originalName: 'screen.mp4',
    });

    expect(result.provider).toBe('mock');
    expect(result.mimeType).toBe('audio/wav');
    const stat = await fs.stat(outputPath);
    expect(stat.size).toBeGreaterThan(0);

    await fs.rm(dir, { recursive: true, force: true });
  });

  it('ffmpeg extractor fails clearly when input cannot be processed', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mm-ffmpeg-'));
    const inputPath = path.join(dir, 'broken.mp4');
    const outputPath = path.join(dir, 'out.wav');
    await fs.writeFile(inputPath, Buffer.from('not a real video'));

    await expect(
      ffmpegAudioExtractionProvider.extract({
        inputPath,
        outputPath,
        mimeType: 'video/mp4',
        originalName: 'broken.mp4',
      }),
    ).rejects.toBeInstanceOf(AppError);

    await fs.rm(dir, { recursive: true, force: true });
  });
});
