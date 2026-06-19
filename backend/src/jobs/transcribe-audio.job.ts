import { MIN_TRANSCRIPT_CHARS } from '../modules/meetings/meeting.dto';
import { meetingRepository } from '../modules/meetings/meeting.repository';
import { aiJobService } from '../modules/ai';
import { meetingAudioRepository } from '../modules/transcription/repositories/meeting-audio.repository';
import { audioStorageService } from '../modules/transcription/services/audio-storage.service';
import { transcriptionService } from '../modules/transcription/services/transcription.service';

export interface TranscribeAudioJobPayload {
  audioId: string;
  meetingId: string;
  workspaceId: string;
}

export async function processTranscribeAudioJob(
  payload: TranscribeAudioJobPayload,
): Promise<void> {
  const audio = await meetingAudioRepository.findById(payload.audioId);
  if (!audio) {
    throw new Error(`Meeting audio not found: ${payload.audioId}`);
  }

  if (audio.status === 'COMPLETED') {
    return;
  }

  await meetingAudioRepository.markTranscribing(audio.id);

  try {
    const filePath = await audioStorageService.resolvePath(audio.storageKey);
    const result = await transcriptionService.transcribe({
      filePath,
      mimeType: audio.mimeType,
      originalName: audio.originalName,
    });

    const content = result.text.normalize('NFC').trim();
    if (content.length < MIN_TRANSCRIPT_CHARS) {
      throw new Error(
        `Transcription too short (${content.length} chars, minimum ${MIN_TRANSCRIPT_CHARS})`,
      );
    }

    await meetingRepository.upsertTranscriptAndStartProcessing(payload.meetingId, {
      content,
      sourceFormat: 'audio',
      charCount: content.length,
    });

    await meetingAudioRepository.markCompleted(audio.id);

    await aiJobService.enqueueProcessing(payload.workspaceId, payload.meetingId, {
      idempotencyKey: `meeting:${payload.meetingId}:audio-transcript`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transcription failed';
    await meetingAudioRepository.markFailed(audio.id, message);
    throw error;
  }
}
