import { env } from '../config/env';
import { startMeetingAiWorker, startEmbedMeetingWorker, startReindexWorkspaceWorker, startWeeklyReportWorker, startTranscribeAudioWorker, startCalendarSyncWorker, scheduleHourlyCalendarSync } from './queue';

if (!env.REDIS_URL) {
  console.error('[worker] REDIS_URL is not set. Start Redis or use AI_USE_MOCK=true for inline processing.');
  process.exit(1);
}

if (env.AI_USE_MOCK) {
  console.info('[worker] AI_USE_MOCK=true — jobs run inline in the API. Worker is not needed.');
  process.exit(0);
}

const meetingWorker = startMeetingAiWorker();
const embedWorker = startEmbedMeetingWorker();
const reindexWorker = startReindexWorkspaceWorker();
const weeklyReportWorker = startWeeklyReportWorker();
const transcribeAudioWorker = startTranscribeAudioWorker();
const calendarSyncWorker = startCalendarSyncWorker();

void scheduleHourlyCalendarSync();

meetingWorker.on('error', (error) => {
  console.error('[worker] Meeting AI Redis connection failed:', error.message);
  process.exit(1);
});

embedWorker.on('error', (error) => {
  console.error('[worker] Embed Redis connection failed:', error.message);
  process.exit(1);
});

reindexWorker.on('error', (error) => {
  console.error('[worker] Reindex Redis connection failed:', error.message);
  process.exit(1);
});

weeklyReportWorker.on('error', (error) => {
  console.error('[worker] Weekly report Redis connection failed:', error.message);
  process.exit(1);
});

transcribeAudioWorker.on('error', (error) => {
  console.error('[worker] Transcribe audio Redis connection failed:', error.message);
  process.exit(1);
});

calendarSyncWorker.on('error', (error) => {
  console.error('[worker] Calendar sync Redis connection failed:', error.message);
  process.exit(1);
});

console.info('[worker] Meeting AI + embed + reindex + weekly-report + transcribe-audio + calendar-sync workers started (waiting for Redis)');

async function shutdown(): Promise<void> {
  await meetingWorker.close();
  await embedWorker.close();
  await reindexWorker.close();
  await weeklyReportWorker.close();
  await transcribeAudioWorker.close();
  await calendarSyncWorker.close();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});
