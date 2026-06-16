import { env } from '../config/env';
import { startMeetingAiWorker } from './queue';

if (!env.REDIS_URL) {
  console.error('[worker] REDIS_URL is not set. Start Redis or use AI_USE_MOCK=true for inline processing.');
  process.exit(1);
}

if (env.AI_USE_MOCK) {
  console.info('[worker] AI_USE_MOCK=true — jobs run inline in the API. Worker is not needed.');
  process.exit(0);
}

const worker = startMeetingAiWorker();

worker.on('error', (error) => {
  console.error('[worker] Redis connection failed:', error.message);
  console.error('[worker] Start Redis (e.g. docker run -p 6379:6379 redis) or set AI_USE_MOCK=true in .env');
  process.exit(1);
});

console.info('[worker] Meeting AI worker started (waiting for Redis)');

async function shutdown(): Promise<void> {
  await worker.close();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});
