import { MeetingStatus } from '@prisma/client';
import { env } from '../../../config/env';
import { meetingRepository } from '../../meetings/meeting.repository';
import { meetingAudioRepository } from '../repositories/meeting-audio.repository';
import { audioStorageService } from './audio-storage.service';
import { audioExtractionService } from './audio-extraction.service';
import { transcriptionObservabilityService } from './transcription-observability.service';
import { malwareScanService } from '../../capture/storage/malware-scan.service';
import { enqueueTranscribeAudio } from '../../../jobs/queue';
import { logActivity } from '../../../lib/activity-log';
import { AppError, ErrorCodes } from '../../../utils/errors';
import {
  isVideoUpload,
  type MeetingAudioDto,
  type StartTranscriptionDto,
  type TranscriptionMode,
  type TranscriptionStatusDto,
  type UploadAudioResponseDto,
  type UploadedAudioFile,
} from '../types/transcription.types';

function toMeetingAudioDto(audio: {
  id: string;
  meetingId: string;
  workspaceId: string;
  originalName: string;
  mimeType: string;
  fileSizeBytes: number;
  status: MeetingAudioDto['status'];
  errorMessage: string | null;
  transcribedAt: Date | null;
  createdAt: Date;
}): MeetingAudioDto {
  return {
    id: audio.id,
    meetingId: audio.meetingId,
    workspaceId: audio.workspaceId,
    originalName: audio.originalName,
    mimeType: audio.mimeType,
    fileSizeBytes: audio.fileSizeBytes,
    status: audio.status,
    errorMessage: audio.errorMessage,
    transcribedAt: audio.transcribedAt,
    createdAt: audio.createdAt,
  };
}

function assertMeetingAllowsAudioUpload(status: MeetingStatus): void {
  if (status === MeetingStatus.TRANSCRIBING) {
    throw new AppError(409, ErrorCodes.CONFLICT, 'Meeting is already translating / transcribing');
  }
  if (status === MeetingStatus.PROCESSING) {
    throw new AppError(409, ErrorCodes.CONFLICT, 'Meeting is already processing');
  }
}

function resolveMode(mode?: TranscriptionMode): TranscriptionMode {
  return mode === 'transcribe_original' ? 'transcribe_original' : 'translate_to_english';
}

export class TranscriptionOrchestratorService {
  /**
   * Upload stores media only. Meeting stays DRAFT (or resets to DRAFT on replace).
   * Does NOT enqueue Whisper / AI — call startTranscription.
   */
  async uploadAudio(
    workspaceId: string,
    meetingId: string,
    userId: string,
    file: UploadedAudioFile,
  ): Promise<UploadAudioResponseDto> {
    const meeting = await meetingRepository.findMeetingInWorkspace(workspaceId, meetingId);
    if (!meeting) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Meeting not found');
    }

    assertMeetingAllowsAudioUpload(meeting.status);

    const existingAudio = await meetingAudioRepository.findByMeetingId(meetingId);
    let replacedPreviousAudioId: string | undefined;
    if (existingAudio) {
      replacedPreviousAudioId = existingAudio.id;
      await audioStorageService.deleteFile(existingAudio.storageKey);
      await audioStorageService.clearMeetingMedia?.(workspaceId, meetingId);
      await meetingAudioRepository.deleteByMeetingId(meetingId);
    }

    const scan = await malwareScanService.scanUpload({
      workspaceId,
      meetingId,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
    });
    if (!scan.clean) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Recording failed malware scan');
    }

    const video = isVideoUpload(file);
    const saved = await audioStorageService.saveUploadedFile(workspaceId, meetingId, file);

    const hadTranscriptOrReady =
      Boolean(meeting.transcript) || meeting.status === MeetingStatus.READY;

    const audio = await meetingAudioRepository.createPendingAudio({
      meetingId,
      workspaceId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      storageKey: saved.storageKey,
      // After replace of a processed meeting, clear READY so UI shows "uploaded, not processed"
      resetMeetingToDraft: hadTranscriptOrReady || meeting.status === MeetingStatus.FAILED,
    });

    await logActivity({
      workspaceId,
      actorId: userId,
      action: video ? 'meeting.video_uploaded' : 'meeting.audio_uploaded',
      entityType: 'meeting',
      entityId: meetingId,
      metadata: {
        audioId: audio.id,
        fileName: file.originalname,
        fileSizeBytes: file.size,
        mediaKind: video ? 'video' : 'audio',
        processingStarted: false,
        replaced: Boolean(replacedPreviousAudioId),
        previousAudioId: replacedPreviousAudioId,
      },
    });

    const refreshed = await meetingRepository.findMeetingInWorkspace(workspaceId, meetingId);

    return {
      meetingId,
      audioId: audio.id,
      status: audio.status,
      meetingStatus: refreshed!.status,
      processingStarted: false,
      audio: toMeetingAudioDto(audio),
    };
  }

  /**
   * User-triggered Translate & Transcribe (or optional original-language transcribe).
   * Extract audio if video → Whisper translate/transcribe → AI pipeline.
   */
  async startTranscription(
    workspaceId: string,
    meetingId: string,
    userId: string,
    body: StartTranscriptionDto = {},
  ): Promise<UploadAudioResponseDto> {
    const mode = resolveMode(body.mode);
    const meeting = await meetingRepository.findMeetingInWorkspace(workspaceId, meetingId);
    if (!meeting) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Meeting not found');
    }

    if (
      meeting.status === MeetingStatus.TRANSCRIBING ||
      meeting.status === MeetingStatus.PROCESSING
    ) {
      throw new AppError(
        409,
        ErrorCodes.CONFLICT,
        'Meeting is already translating, transcribing, or processing',
      );
    }

    const audio = await meetingAudioRepository.findByMeetingId(meetingId);
    if (!audio) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'No recording found for this meeting');
    }

    const prepared = await meetingAudioRepository.prepareForStart(audio.id, meetingId);

    transcriptionObservabilityService.recordRetry({
      workspaceId,
      meetingId,
      audioId: audio.id,
    });

    await logActivity({
      workspaceId,
      actorId: userId,
      action: 'meeting.transcription_started',
      entityType: 'meeting',
      entityId: meetingId,
      metadata: { audioId: audio.id, mode },
    });

    await enqueueTranscribeAudio({
      audioId: prepared.id,
      meetingId,
      workspaceId,
      mode,
    });

    const refreshed = await meetingRepository.findMeetingInWorkspace(workspaceId, meetingId);
    const latestAudio = await meetingAudioRepository.findByMeetingId(meetingId);

    return {
      meetingId,
      audioId: prepared.id,
      status: latestAudio?.status ?? prepared.status,
      meetingStatus: refreshed!.status,
      processingStarted: true,
      audio: latestAudio ? toMeetingAudioDto(latestAudio) : toMeetingAudioDto(prepared),
    };
  }

  /** Alias: FAILED retry uses the same start path (translate_to_english by default). */
  async retryTranscription(
    workspaceId: string,
    meetingId: string,
    userId: string,
  ): Promise<UploadAudioResponseDto> {
    const meeting = await meetingRepository.findMeetingInWorkspace(workspaceId, meetingId);
    if (!meeting) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Meeting not found');
    }

    if (
      meeting.status === MeetingStatus.TRANSCRIBING ||
      meeting.status === MeetingStatus.PROCESSING
    ) {
      throw new AppError(409, ErrorCodes.CONFLICT, 'Meeting is already busy');
    }

    const audio = await meetingAudioRepository.findByMeetingId(meetingId);
    if (!audio) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'No recording found for this meeting');
    }

    if (audio.status !== 'FAILED' && meeting.status !== MeetingStatus.FAILED) {
      throw new AppError(
        409,
        ErrorCodes.CONFLICT,
        'Only failed jobs can use retry. Use Translate & Transcribe to process a pending upload.',
      );
    }

    return this.startTranscription(workspaceId, meetingId, userId, {
      mode: 'translate_to_english',
    });
  }

  async getTranscriptionStatus(
    workspaceId: string,
    meetingId: string,
  ): Promise<TranscriptionStatusDto> {
    const meeting = await meetingRepository.findMeetingInWorkspace(workspaceId, meetingId);
    if (!meeting) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Meeting not found');
    }

    const audio = await meetingAudioRepository.findByMeetingId(meetingId);

    return {
      meetingId,
      meetingStatus: meeting.status,
      audio: audio ? toMeetingAudioDto(audio) : null,
      transcript: meeting.transcript
        ? {
            charCount: meeting.transcript.charCount,
            sourceFormat: meeting.transcript.sourceFormat,
            uploadedAt: meeting.transcript.uploadedAt,
          }
        : null,
    };
  }

  /**
   * Extract audio from stored video before Whisper (called from job).
   * Returns updated storage key / mime for transcription.
   */
  async ensureAudioForTranscription(audioId: string): Promise<{
    storageKey: string;
    mimeType: string;
    fileSizeBytes: number;
    originalName: string;
  }> {
    const audio = await meetingAudioRepository.findById(audioId);
    if (!audio) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Recording not found');
    }

    const video = isVideoUpload({
      mimetype: audio.mimeType,
      originalname: audio.originalName,
    });

    if (!video) {
      return {
        storageKey: audio.storageKey,
        mimeType: audio.mimeType,
        fileSizeBytes: audio.fileSizeBytes,
        originalName: audio.originalName,
      };
    }

    // Already extracted to wav/audio
    if (audio.mimeType.startsWith('audio/') || audio.storageKey.toLowerCase().endsWith('.wav')) {
      return {
        storageKey: audio.storageKey,
        mimeType: audio.mimeType,
        fileSizeBytes: audio.fileSizeBytes,
        originalName: audio.originalName,
      };
    }

    const inputPath = await audioStorageService.resolvePath(audio.storageKey);
    const allocated = await audioStorageService.allocateExtractedAudioPath(
      audio.workspaceId,
      audio.meetingId,
      '.wav',
    );
    const extraction = await audioExtractionService.extract(
      {
        inputPath,
        outputPath: allocated.absolutePath,
        mimeType: audio.mimeType,
        originalName: audio.originalName,
      },
      { workspaceId: audio.workspaceId, meetingId: audio.meetingId },
    );

    const fs = await import('fs/promises');
    const stat = await fs.stat(allocated.absolutePath);

    if (env.VIDEO_DISCARD_AFTER_EXTRACT) {
      await audioStorageService.deleteFile(audio.storageKey);
    }

    const updated = await meetingAudioRepository.updateStorageAfterExtract(audio.id, {
      storageKey: allocated.storageKey,
      mimeType: extraction.mimeType,
      fileSizeBytes: stat.size,
    });

    return {
      storageKey: updated.storageKey,
      mimeType: updated.mimeType,
      fileSizeBytes: updated.fileSizeBytes,
      originalName: updated.originalName,
    };
  }
}

export const transcriptionOrchestratorService = new TranscriptionOrchestratorService();
