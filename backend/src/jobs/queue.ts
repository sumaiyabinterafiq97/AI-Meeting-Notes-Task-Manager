import { Queue, Worker } from 'bullmq';
import { env } from '../config/env';
import { processMeetingJob } from './process-meeting.job';
import { processEmbedMeetingJob } from './embed-meeting.job';
import { processReindexWorkspaceJob } from './reindex-workspace.job';
import { processWeeklyReportJob } from './weekly-report.job';
import { processTranscribeAudioJob } from './transcribe-audio.job';
import { processCalendarSyncJob } from './calendar-sync.job';
import { aiRepository } from '../modules/ai/ai.repository';
import { meetingAudioRepository } from '../modules/transcription/repositories/meeting-audio.repository';
import type { SyncConnectionResult } from '../modules/calendar/types/calendar.types';

const MEETING_QUEUE_NAME = 'meeting-ai-processing';
const EMBED_QUEUE_NAME = 'embed-meeting';
const REINDEX_QUEUE_NAME = 'reindex-workspace';
const WEEKLY_REPORT_QUEUE_NAME = 'weekly-report';
const TRANSCRIBE_AUDIO_QUEUE_NAME = 'transcribe-audio';
const CALENDAR_SYNC_QUEUE_NAME = 'calendar-sync';

function shouldUseRedisQueue(): boolean {
  return Boolean(env.REDIS_URL) && env.NODE_ENV !== 'test' && !env.AI_USE_MOCK;
}

function getConnectionOptions() {
  return {
    url: env.REDIS_URL!,
    maxRetriesPerRequest: null,
  };
}

let meetingQueue: Queue | null = null;
let embedQueue: Queue | null = null;
let reindexQueue: Queue | null = null;
let weeklyReportQueue: Queue | null = null;
let transcribeAudioQueue: Queue | null = null;
let calendarSyncQueue: Queue | null = null;

function getMeetingQueue(): Queue {
  if (!meetingQueue) {
    meetingQueue = new Queue(MEETING_QUEUE_NAME, {
      connection: getConnectionOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return meetingQueue;
}

function getEmbedQueue(): Queue {
  if (!embedQueue) {
    embedQueue = new Queue(EMBED_QUEUE_NAME, {
      connection: getConnectionOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return embedQueue;
}

function getReindexQueue(): Queue {
  if (!reindexQueue) {
    reindexQueue = new Queue(REINDEX_QUEUE_NAME, {
      connection: getConnectionOptions(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    });
  }
  return reindexQueue;
}

function getWeeklyReportQueue(): Queue {
  if (!weeklyReportQueue) {
    weeklyReportQueue = new Queue(WEEKLY_REPORT_QUEUE_NAME, {
      connection: getConnectionOptions(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });
  }
  return weeklyReportQueue;
}

function getTranscribeAudioQueue(): Queue {
  if (!transcribeAudioQueue) {
    transcribeAudioQueue = new Queue(TRANSCRIBE_AUDIO_QUEUE_NAME, {
      connection: getConnectionOptions(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return transcribeAudioQueue;
}

function getCalendarSyncQueue(): Queue {
  if (!calendarSyncQueue) {
    calendarSyncQueue = new Queue(CALENDAR_SYNC_QUEUE_NAME, {
      connection: getConnectionOptions(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 15_000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return calendarSyncQueue;
}

export async function enqueueCalendarSync(payload: {
  workspaceId?: string;
}): Promise<{ queued: true } | { queued: false; results: SyncConnectionResult[] }> {
  if (!shouldUseRedisQueue()) {
    const results = await processCalendarSyncJob(payload);
    return { queued: false, results };
  }

  await getCalendarSyncQueue().add('calendar-sync', payload, {
    jobId: payload.workspaceId
      ? `calendar-sync-${payload.workspaceId}-${Date.now()}`
      : `calendar-sync-all-${Date.now()}`,
  });
  return { queued: true };
}

export async function scheduleHourlyCalendarSync(): Promise<void> {
  if (!shouldUseRedisQueue()) {
    return;
  }

  await getCalendarSyncQueue().add(
    'calendar-sync',
    {},
    {
      repeat: { pattern: '0 * * * *' },
      jobId: 'calendar-sync-hourly',
    },
  );
}

export async function enqueueTranscribeAudio(payload: {
  audioId: string;
  meetingId: string;
  workspaceId: string;
}): Promise<void> {
  if (!shouldUseRedisQueue()) {
    await processTranscribeAudioJob(payload);
    return;
  }

  const bullJob = await getTranscribeAudioQueue().add('transcribe-audio', payload, {
    jobId: `transcribe-audio-${payload.audioId}`,
  });

  await meetingAudioRepository.setBullJobId(payload.audioId, String(bullJob.id));
}

export async function enqueueWeeklyReport(payload: {
  workspaceId: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<void> {
  if (!shouldUseRedisQueue()) {
    await processWeeklyReportJob(payload);
    return;
  }

  await getWeeklyReportQueue().add('weekly-report', payload, {
    jobId: `weekly-report-${payload.workspaceId}-${payload.dateFrom ?? 'auto'}`,
  });
}

export async function enqueueMeetingProcessing(jobId: string): Promise<void> {
  if (!shouldUseRedisQueue()) {
    await processMeetingJob(jobId);
    return;
  }

  const bullJob = await getMeetingQueue().add(
    'process-meeting',
    { jobId },
    { jobId: `meeting-ai-${jobId}` },
  );

  await aiRepository.setBullJobId(jobId, String(bullJob.id));
}

export async function enqueueEmbedMeeting(payload: {
  meetingId: string;
  workspaceId: string;
}): Promise<void> {
  if (!shouldUseRedisQueue()) {
    await processEmbedMeetingJob(payload);
    return;
  }

  await getEmbedQueue().add('embed-meeting', payload, {
    jobId: `embed-meeting-${payload.meetingId}`,
  });
}

export async function enqueueReindexWorkspace(payload: {
  workspaceId: string;
  reason?: import('../modules/embeddings/services/reindex-observability.service').ReindexReason;
}): Promise<{ queued: true } | { queued: false; result: Awaited<ReturnType<typeof processReindexWorkspaceJob>> }> {
  if (!shouldUseRedisQueue()) {
    const result = await processReindexWorkspaceJob(payload);
    return { queued: false, result };
  }

  await getReindexQueue().add('reindex-workspace', payload, {
    jobId: `reindex-workspace-${payload.workspaceId}-${Date.now()}`,
  });
  return { queued: true };
}

export function startMeetingAiWorker(): Worker {
  const worker = new Worker(
    MEETING_QUEUE_NAME,
    async (bullJob) => {
      const { jobId } = bullJob.data as { jobId: string };
      await processMeetingJob(jobId);
    },
    {
      connection: getConnectionOptions(),
      concurrency: 2,
    },
  );

  worker.on('failed', (job, error) => {
    console.error(`[worker] Job ${job?.id} failed:`, error.message);
  });

  return worker;
}

export function startTranscribeAudioWorker(): Worker {
  const worker = new Worker(
    TRANSCRIBE_AUDIO_QUEUE_NAME,
    async (bullJob) => {
      const payload = bullJob.data as {
        audioId: string;
        meetingId: string;
        workspaceId: string;
      };
      await processTranscribeAudioJob(payload);
    },
    {
      connection: getConnectionOptions(),
      concurrency: 1,
    },
  );

  worker.on('failed', (job, error) => {
    console.error(`[worker] Transcribe audio job ${job?.id} failed:`, error.message);
  });

  return worker;
}

export function startWeeklyReportWorker(): Worker {
  const worker = new Worker(
    WEEKLY_REPORT_QUEUE_NAME,
    async (bullJob) => {
      const payload = bullJob.data as {
        workspaceId: string;
        dateFrom?: string;
        dateTo?: string;
      };
      await processWeeklyReportJob(payload);
    },
    {
      connection: getConnectionOptions(),
      concurrency: 1,
    },
  );

  worker.on('failed', (job, error) => {
    console.error(`[worker] Weekly report job ${job?.id} failed:`, error.message);
  });

  return worker;
}

export function startEmbedMeetingWorker(): Worker {
  const worker = new Worker(
    EMBED_QUEUE_NAME,
    async (bullJob) => {
      const payload = bullJob.data as { meetingId: string; workspaceId: string };
      await processEmbedMeetingJob(payload);
    },
    {
      connection: getConnectionOptions(),
      concurrency: 2,
    },
  );

  worker.on('failed', (job, error) => {
    console.error(`[worker] Embed job ${job?.id} failed:`, error.message);
  });

  return worker;
}

export function startReindexWorkspaceWorker(): Worker {
  const worker = new Worker(
    REINDEX_QUEUE_NAME,
    async (bullJob) => {
      const payload = bullJob.data as { workspaceId: string };
      await processReindexWorkspaceJob(payload);
    },
    {
      connection: getConnectionOptions(),
      concurrency: 1,
    },
  );

  worker.on('failed', (job, error) => {
    console.error(`[worker] Reindex workspace job ${job?.id} failed:`, error.message);
  });

  return worker;
}

export function startCalendarSyncWorker(): Worker {
  const worker = new Worker(
    CALENDAR_SYNC_QUEUE_NAME,
    async (bullJob) => {
      const payload = bullJob.data as { workspaceId?: string };
      await processCalendarSyncJob(payload);
    },
    {
      connection: getConnectionOptions(),
      concurrency: 1,
    },
  );

  worker.on('failed', (job, error) => {
    console.error(`[worker] Calendar sync job ${job?.id} failed:`, error.message);
  });

  return worker;
}

export async function closeQueueConnections(): Promise<void> {
  if (meetingQueue) {
    await meetingQueue.close();
    meetingQueue = null;
  }
  if (embedQueue) {
    await embedQueue.close();
    embedQueue = null;
  }
  if (reindexQueue) {
    await reindexQueue.close();
    reindexQueue = null;
  }
  if (weeklyReportQueue) {
    await weeklyReportQueue.close();
    weeklyReportQueue = null;
  }
  if (transcribeAudioQueue) {
    await transcribeAudioQueue.close();
    transcribeAudioQueue = null;
  }
  if (calendarSyncQueue) {
    await calendarSyncQueue.close();
    calendarSyncQueue = null;
  }
}
