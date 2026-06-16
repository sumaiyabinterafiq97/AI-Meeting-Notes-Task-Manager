import { aiRepository } from '../modules/ai/ai.repository';
import { enqueueMeetingProcessing } from './queue';

export class AiJobService {
  async enqueueProcessing(
    workspaceId: string,
    meetingId: string,
    options: { idempotencyKey?: string; force?: boolean } = {},
  ): Promise<string> {
    if (!options.force) {
      const active = await aiRepository.findActiveJobForMeeting(meetingId);
      if (active) {
        return active.id;
      }
    }

    const job = await aiRepository.createJob({
      meetingId,
      workspaceId,
      idempotencyKey: options.idempotencyKey,
    });

    await enqueueMeetingProcessing(job.id);
    return job.id;
  }
}

export const aiJobService = new AiJobService();
