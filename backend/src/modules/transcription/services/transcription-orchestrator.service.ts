import { MeetingStatus } from '@prisma/client';
import { meetingRepository } from '../../meetings/meeting.repository';
import { meetingAudioRepository } from '../repositories/meeting-audio.repository';
import { audioStorageService } from './audio-storage.service';
import { enqueueTranscribeAudio } from '../../../jobs/queue';
import { logActivity } from '../../../lib/activity-log';
import { AppError, ErrorCodes } from '../../../utils/errors';
import type {
  MeetingAudioDto,
  TranscriptionStatusDto,
  UploadAudioResponseDto,
  UploadedAudioFile,
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

    const existingAudio = await meetingAudioRepository.findByMeetingId(meetingId);
    if (existingAudio && existingAudio.status !== 'FAILED') {
      throw new AppError(409, ErrorCodes.CONFLICT, 'Audio already uploaded for this meeting');
    }

    if (existingAudio?.status === 'FAILED') {
      await audioStorageService.deleteFile(existingAudio.storageKey);
      await meetingAudioRepository.deleteByMeetingId(meetingId);
    }

    const { storageKey } = await audioStorageService.saveUploadedFile(
      workspaceId,
      meetingId,
      file,
    );

    const audio = await meetingAudioRepository.createPendingAudio({
      meetingId,
      workspaceId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      storageKey,
    });

    await logActivity({
      workspaceId,
      actorId: userId,
      action: 'meeting.audio_uploaded',
      entityType: 'meeting',
      entityId: meetingId,
      metadata: {
        audioId: audio.id,
        fileName: file.originalname,
        fileSizeBytes: file.size,
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
