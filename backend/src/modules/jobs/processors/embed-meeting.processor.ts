import { processEmbedMeetingJob } from '../../../jobs/embed-meeting.job';

/**
 * embed-meeting job processor — delegates to meeting embedding service.
 * @see docs/embedding-flow.md
 */
export async function processEmbedMeetingJobProcessor(payload: {
  meetingId: string;
  workspaceId: string;
}): Promise<void> {
  await processEmbedMeetingJob(payload);
}
