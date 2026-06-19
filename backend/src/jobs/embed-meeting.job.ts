import { meetingEmbeddingService } from '../modules/embeddings/services/meeting-embedding.service';

export async function processEmbedMeetingJob(payload: {
  meetingId: string;
  workspaceId: string;
}): Promise<void> {
  await meetingEmbeddingService.embedMeeting(payload.meetingId, payload.workspaceId);
}
