import { MeetingStatus, TranscriptionJobStatus, type MeetingAudio } from '@prisma/client';
import { prisma } from '../../../config/database';

export class MeetingAudioRepository {
  async findById(audioId: string): Promise<MeetingAudio | null> {
    return prisma.meetingAudio.findUnique({ where: { id: audioId } });
  }

  async findByMeetingId(meetingId: string): Promise<MeetingAudio | null> {
    return prisma.meetingAudio.findUnique({ where: { meetingId } });
  }

  /**
   * Stores uploaded media in PENDING state. Meeting stays DRAFT (or prior status
   * if READY with old transcript) — does NOT start TRANSCRIBING.
   */
  async createPendingAudio(data: {
    meetingId: string;
    workspaceId: string;
    originalName: string;
    mimeType: string;
    fileSizeBytes: number;
    storageKey: string;
    /** When replacing after READY, reset meeting to DRAFT so UI shows "not processed". */
    resetMeetingToDraft?: boolean;
  }): Promise<MeetingAudio> {
    return prisma.$transaction(async (tx) => {
      if (data.resetMeetingToDraft) {
        await tx.meeting.update({
          where: { id: data.meetingId },
          data: { status: MeetingStatus.DRAFT },
        });
      }

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

  async updateStorageAfterExtract(
    audioId: string,
    data: { storageKey: string; mimeType: string; fileSizeBytes: number },
  ): Promise<MeetingAudio> {
    return prisma.meetingAudio.update({
      where: { id: audioId },
      data: {
        storageKey: data.storageKey,
        mimeType: data.mimeType,
        fileSizeBytes: data.fileSizeBytes,
      },
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

  /** Prepare audio + meeting for Translate & Transcribe (or retry). */
  async prepareForStart(audioId: string, meetingId: string): Promise<MeetingAudio> {
    return prisma.$transaction(async (tx) => {
      const audio = await tx.meetingAudio.update({
        where: { id: audioId },
        data: {
          status: TranscriptionJobStatus.PENDING,
          errorMessage: null,
          transcribedAt: null,
          bullJobId: null,
        },
      });

      await tx.meeting.update({
        where: { id: meetingId },
        data: { status: MeetingStatus.TRANSCRIBING },
      });

      return audio;
    });
  }

  async resetForRetry(audioId: string): Promise<MeetingAudio> {
    const audio = await this.findById(audioId);
    if (!audio) {
      throw new Error(`Meeting audio not found: ${audioId}`);
    }
    return this.prepareForStart(audioId, audio.meetingId);
  }

  async deleteByMeetingId(meetingId: string): Promise<void> {
    await prisma.meetingAudio.deleteMany({ where: { meetingId } });
  }
}

export const meetingAudioRepository = new MeetingAudioRepository();
