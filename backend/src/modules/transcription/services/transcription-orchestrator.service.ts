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
    throw new AppError(409, ErrorCodes.CONFLICT, 'Meeting is already transcribing');
  }
  if (status === MeetingStatus.PROCESSING) {
    throw new AppError(409, ErrorCodes.CONFLICT, 'Meeting is already processing');
  }
}

export class TranscriptionOrchestratorService {
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

    // Replace-on-upload: any existing recording is removed before saving the new file.
    // Busy meetings (TRANSCRIBING / PROCESSING) are rejected above.
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

    let transcriptionStorageKey = saved.storageKey;
    let transcriptionMimeType = file.mimetype;
    let transcriptionFileSize = file.size;
    let extracted = false;

    if (video) {
      try {
        const allocated = await audioStorageService.allocateExtractedAudioPath(
          workspaceId,
          meetingId,
          '.wav',
        );
        const extraction = await audioExtractionService.extract(
          {
            inputPath: saved.absolutePath,
            outputPath: allocated.absolutePath,
            mimeType: file.mimetype,
            originalName: file.originalname,
          },
          { workspaceId, meetingId },
        );

        transcriptionStorageKey = allocated.storageKey;
        transcriptionMimeType = extraction.mimeType;
        const fs = await import('fs/promises');
        const stat = await fs.stat(allocated.absolutePath);
        transcriptionFileSize = stat.size;
        extracted = true;

        if (env.VIDEO_DISCARD_AFTER_EXTRACT) {
          await audioStorageService.deleteFile(saved.storageKey);
        }
      } catch (error) {
        await audioStorageService.deleteFile(saved.storageKey);
        throw error;
      }
    }

    const audio = await meetingAudioRepository.createPendingAudio({
      meetingId,
      workspaceId,
      originalName: file.originalname,
      mimeType: transcriptionMimeType,
      fileSizeBytes: transcriptionFileSize,
      storageKey: transcriptionStorageKey,
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
        audioExtracted: extracted,
        extractProvider: video ? audioExtractionService.getActiveProviderId() : undefined,
        replaced: Boolean(replacedPreviousAudioId),
        previousAudioId: replacedPreviousAudioId,
      },
    });

    await enqueueTranscribeAudio({
      audioId: audio.id,
      meetingId,
      workspaceId,
    });

    const refreshed = await meetingRepository.findMeetingInWorkspace(workspaceId, meetingId);

    return {
      meetingId,
      audioId: audio.id,
      status: audio.status,
      meetingStatus: refreshed!.status,
    };
  }

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

    if (audio.status !== 'FAILED') {
      throw new AppError(
        409,
        ErrorCodes.CONFLICT,
        'Only failed transcriptions can be retried. Re-upload to replace a completed file.',
      );
    }

    const reset = await meetingAudioRepository.resetForRetry(audio.id);

    transcriptionObservabilityService.recordRetry({
      workspaceId,
      meetingId,
      audioId: audio.id,
    });

    await logActivity({
      workspaceId,
      actorId: userId,
      action: 'meeting.transcription_retried',
      entityType: 'meeting',
      entityId: meetingId,
      metadata: { audioId: audio.id },
    });

    await enqueueTranscribeAudio({
      audioId: reset.id,
      meetingId,
      workspaceId,
    });

    const refreshed = await meetingRepository.findMeetingInWorkspace(workspaceId, meetingId);

    return {
      meetingId,
      audioId: reset.id,
      status: reset.status,
      meetingStatus: refreshed!.status,
    };
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
}

export const transcriptionOrchestratorService = new TranscriptionOrchestratorService();
