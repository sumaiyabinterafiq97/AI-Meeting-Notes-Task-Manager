import { env } from '../../../config/env';
import { metricsService } from '../../observability/metrics/metrics.service';
import { structuredLogger } from '../../observability/logging/structured-logger';
import { mockAudioExtractionProvider } from '../providers/mock-audio-extraction.provider';
import { ffmpegAudioExtractionProvider } from '../providers/ffmpeg-audio-extraction.provider';
import type {
  AudioExtractionInput,
  AudioExtractionResult,
  IAudioExtractionProvider,
} from '../providers/audio-extraction.interface';

function resolveProvider(): IAudioExtractionProvider {
  if (env.AI_USE_MOCK || env.AUDIO_EXTRACT_PROVIDER === 'mock') {
    return mockAudioExtractionProvider;
  }
  return ffmpegAudioExtractionProvider;
}

export class AudioExtractionService {
  getActiveProviderId(): IAudioExtractionProvider['id'] {
    return resolveProvider().id;
  }

  async extract(
    input: AudioExtractionInput,
    labels?: { workspaceId?: string; meetingId?: string },
  ): Promise<AudioExtractionResult> {
    const provider = resolveProvider();
    const result = await provider.extract(input);

    metricsService.recordLatency('capture.audio_extract.duration', result.durationMs, {
      workspaceId: labels?.workspaceId,
      provider: result.provider,
      jobType: 'audio-extract',
      status: 'success',
    });

    structuredLogger.info(
      {
        component: 'capture.audio-extract',
        workspaceId: labels?.workspaceId,
        meetingId: labels?.meetingId,
        provider: result.provider,
        durationMs: result.durationMs,
        // never log paths' contents or raw media
      },
      'audio extracted from video',
    );

    return result;
  }
}

export const audioExtractionService = new AudioExtractionService();
