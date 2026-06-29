import { EmbeddingJobStatus } from '@prisma/client';
import { prisma } from '../../../config/database';
import type { EmbeddingJobStatusDto } from '../dto/embedding.dto';

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

  async findById(jobId: string) {
    return prisma.embeddingJob.findUnique({ where: { id: jobId } });
  }

  async findLatestForMeeting(meetingId: string) {
    return prisma.embeddingJob.findFirst({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForMeeting(meetingId: string, limit = 10) {
    return prisma.embeddingJob.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  toStatusDto(job: NonNullable<Awaited<ReturnType<EmbeddingRepository['findById']>>>): EmbeddingJobStatusDto {
    return {
      id: job.id,
      workspaceId: job.workspaceId,
      meetingId: job.meetingId,
      status: job.status,
      chunksTotal: job.chunksTotal,
      chunksProcessed: job.chunksProcessed,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
    };
  }
}

export const embeddingRepository = new EmbeddingRepository();
