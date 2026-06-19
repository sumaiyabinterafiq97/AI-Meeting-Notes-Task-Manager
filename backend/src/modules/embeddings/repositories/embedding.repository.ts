import { EmbeddingJobStatus } from '@prisma/client';
import { prisma } from '../../../config/database';

export class EmbeddingRepository {
  async createJob(workspaceId: string, meetingId: string, chunksTotal: number) {
    return prisma.embeddingJob.create({
      data: {
        workspaceId,
        meetingId,
        chunksTotal,
        status: EmbeddingJobStatus.PENDING,
      },
    });
  }

  async markRunning(jobId: string) {
    return prisma.embeddingJob.update({
      where: { id: jobId },
      data: {
        status: EmbeddingJobStatus.RUNNING,
        startedAt: new Date(),
        errorMessage: null,
      },
    });
  }

  async updateProgress(jobId: string, chunksProcessed: number) {
    return prisma.embeddingJob.update({
      where: { id: jobId },
      data: { chunksProcessed },
    });
  }

  async markCompleted(jobId: string, chunksProcessed: number) {
    return prisma.embeddingJob.update({
      where: { id: jobId },
      data: {
        status: EmbeddingJobStatus.COMPLETED,
        chunksProcessed,
        completedAt: new Date(),
        errorMessage: null,
      },
    });
  }

  async markFailed(jobId: string, errorMessage: string) {
    return prisma.embeddingJob.update({
      where: { id: jobId },
      data: {
        status: EmbeddingJobStatus.FAILED,
        completedAt: new Date(),
        errorMessage,
      },
    });
  }

  async findLatestForMeeting(meetingId: string) {
    return prisma.embeddingJob.findFirst({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const embeddingRepository = new EmbeddingRepository();
