import { Queue, Worker } from 'bullmq';
import { env } from '../config/env';
import { processMeetingJob } from './process-meeting.job';
import { aiRepository } from '../modules/ai/ai.repository';

const QUEUE_NAME = 'meeting-ai-processing';

function shouldUseRedisQueue(): boolean {
  return Boolean(env.REDIS_URL) && env.NODE_ENV !== 'test' && !env.AI_USE_MOCK;
}

function getConnectionOptions() {
  return {
    url: env.REDIS_URL!,
    maxRetriesPerRequest: null,
  };
}

let queue: Queue | null = null;

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
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
  return queue;
}

export async function enqueueMeetingProcessing(jobId: string): Promise<void> {
  if (!shouldUseRedisQueue()) {
    await processMeetingJob(jobId);
    return;
  }

  const bullJob = await getQueue().add(
    'process-meeting',
    { jobId },
    { jobId: `meeting-ai-${jobId}` },
  );

  await aiRepository.setBullJobId(jobId, String(bullJob.id));
}

export function startMeetingAiWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAME,
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

export async function closeQueueConnections(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}
