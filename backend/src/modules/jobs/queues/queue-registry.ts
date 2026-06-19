import type { JobQueueName } from '../types/job.types';

/**
 * Queue registry for MeetingMind AI background jobs.
 * Existing meeting-ai queue lives in src/jobs/queue.ts — migrate here in a future pass.
 */
export const QUEUE_NAMES: Record<string, JobQueueName> = {
  MEETING_AI: 'meeting-ai-processing',
  EMBED_MEETING: 'embed-meeting',
  WEEKLY_REPORT: 'weekly-report',
  REINDEX_WORKSPACE: 'reindex-workspace',
  TRANSCRIBE_AUDIO: 'transcribe-audio',
  CALENDAR_SYNC: 'calendar-sync',
};

export class QueueRegistry {
  list(): JobQueueName[] {
    return Object.values(QUEUE_NAMES);
  }

  isRegistered(name: string): boolean {
    return Object.values(QUEUE_NAMES).includes(name as JobQueueName);
  }
}

export const queueRegistry = new QueueRegistry();
