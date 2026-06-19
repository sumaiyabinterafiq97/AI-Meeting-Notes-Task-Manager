import { MeetingStatus, TranscriptionJobStatus, type MeetingAudio } from '@prisma/client';
import { prisma } from '../../../config/database';

export class MeetingAudioRepository {
  async findById(audioId: string): Promise<MeetingAudio | null> {
    return prisma.meetingAudio.findUnique({ where: { id: audioId } });
  }

  async findByMeetingId(meetingId: string): Promise<MeetingAudio | null> {
    return prisma.meetingAudio.findUnique({ where: { meetingId } });
  }

  async createPendingAudio(data: {
    meetingId: string;
    workspaceId: string;
    originalName: string;
    mimeType: string;
    fileSizeBytes: number;
    storageKey: string;
  }): Promise<MeetingAudio> {
    return prisma.$transaction(async (tx) => {
      await tx.meeting.update({
        where: { id: data.meetingId },
        data: { status: MeetingStatus.TRANSCRIBING },
      });

      return tx.meetingAudio.create({
        data: {
          meetingId: data.meetingId,
          workspaceId: data.workspaceId,
          originalName: data.originalName,
          mimeType: data.mimeType,
          fileSizeBytes: data.fileSizeBytes,
          storageKey: data.storageKey,
          status: TranscriptionJobStatus.PENDING,
        },
      });
    });
  }

  async markTranscribing(audioId: string): Promise<MeetingAudio> {
    return prisma.meetingAudio.update({
      where: { id: audioId },
      data: { status: TranscriptionJobStatus.TRANSCRIBING },
    });
  }

  async markCompleted(audioId: string): Promise<MeetingAudio> {
    return prisma.meetingAudio.update({
      where: { id: audioId },
      data: {
        status: TranscriptionJobStatus.COMPLETED,
        transcribedAt: new Date(),
        errorMessage: null,
      },
    });
  }

  async markFailed(audioId: string, errorMessage: string): Promise<MeetingAudio> {
    return prisma.$transaction(async (tx) => {
      const audio = await tx.meetingAudio.update({
        where: { id: audioId },
        data: {
          status: TranscriptionJobStatus.FAILED,
          errorMessage,
        },
      });

      await tx.meeting.update({
        where: { id: audio.meetingId },
        data: { status: MeetingStatus.FAILED },
      });

      return audio;
    });
  }

  async setBullJobId(audioId: string, bullJobId: string): Promise<void> {
    await prisma.meetingAudio.update({
      where: { id: audioId },
      data: { bullJobId },
    });
  }

  async deleteByMeetingId(meetingId: string): Promise<void> {
    await prisma.meetingAudio.deleteMany({ where: { meetingId } });
  }
}

export const meetingAudioRepository = new MeetingAudioRepository();
