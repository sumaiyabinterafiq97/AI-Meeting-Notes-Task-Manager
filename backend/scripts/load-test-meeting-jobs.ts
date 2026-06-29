#!/usr/bin/env node
/**
 * Load test: N concurrent meeting AI processing jobs (mock or live).
 * @see docs/load-test-report.md
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { JobStatus, MeetingStatus, Prisma } from '@prisma/client';
import { prisma } from '../src/config/database';
import { processMeetingJob } from '../src/jobs/process-meeting.job';
import { aiRepository } from '../src/modules/ai/ai.repository';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SAMPLE_TRANSCRIPT = `Alice: Let's review the sprint backlog.
Bob: I'll own the API migration by Friday.
Carol: We decided to ship the dashboard to staging first.`;

function parseArgs(argv: string[]) {
  const options = {
    concurrency: 50,
    outputPath: undefined as string | undefined,
    cleanup: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case '--concurrency':
      case '-c':
        options.concurrency = Math.max(1, Number(next ?? 50));
        i += 1;
        break;
      case '--output':
        options.outputPath = next;
        i += 1;
        break;
      case '--no-cleanup':
        options.cleanup = false;
        break;
      default:
        break;
    }
  }

  return options;
}

async function seedLoadTestWorkspace(jobCount: number) {
  const suffix = randomUUID().slice(0, 8);
  const email = `loadtest-${suffix}@example.com`;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: 'load-test',
      displayName: 'Load Test User',
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: `Load Test ${suffix}`,
      slug: `load-test-${suffix}`,
      createdBy: { connect: { id: user.id } },
      members: {
        create: { userId: user.id, role: 'OWNER' },
      },
    },
  });

  const jobs: { jobId: string; meetingId: string }[] = [];

  for (let i = 0; i < jobCount; i += 1) {
    const meeting = await prisma.meeting.create({
      data: {
        workspaceId: workspace.id,
        title: `Load Test Meeting ${i + 1}`,
        meetingDate: new Date(),
        status: MeetingStatus.READY,
        createdById: user.id,
        transcript: {
          create: {
            content: SAMPLE_TRANSCRIPT,
            sourceFormat: 'text',
            charCount: SAMPLE_TRANSCRIPT.length,
          },
        },
      },
    });

    const job = await aiRepository.createJob({
      meetingId: meeting.id,
      workspaceId: workspace.id,
      idempotencyKey: `load-test-${suffix}-${i}`,
    });

    jobs.push({ jobId: job.id, meetingId: meeting.id });
  }

  return { workspaceId: workspace.id, userId: user.id, jobs };
}

async function cleanupLoadTest(workspaceId: string, userId: string) {
  await prisma.aiProcessingJob.deleteMany({ where: { workspaceId } });
  await prisma.meetingAiOutput.deleteMany({
    where: { meeting: { workspaceId } },
  });
  await prisma.actionItemSuggestion.deleteMany({
    where: { meeting: { workspaceId } },
  });
  await prisma.meetingTranscript.deleteMany({
    where: { meeting: { workspaceId } },
  });
  await prisma.meeting.deleteMany({ where: { workspaceId } });
  await prisma.workspaceMember.deleteMany({ where: { workspaceId } });
  await prisma.workspace.delete({ where: { id: workspaceId } });
  await prisma.user.delete({ where: { id: userId } });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required. Set AI_USE_MOCK=true for mock LLM.');
    process.exit(1);
  }

  process.env.AI_USE_MOCK = process.env.AI_USE_MOCK ?? 'true';

  const startedAt = Date.now();
  const seed = await seedLoadTestWorkspace(options.concurrency);

  const latencies: number[] = [];
  const errors: string[] = [];

  await Promise.all(
    seed.jobs.map(async ({ jobId }) => {
      const jobStart = Date.now();
      try {
        await processMeetingJob(jobId);
        const job = await aiRepository.findJobById(jobId);
        if (job?.status !== JobStatus.COMPLETED) {
          errors.push(`${jobId}: status ${job?.status ?? 'unknown'}`);
        }
        latencies.push(Date.now() - jobStart);
      } catch (error) {
        errors.push(`${jobId}: ${error instanceof Error ? error.message : String(error)}`);
        latencies.push(Date.now() - jobStart);
      }
    }),
  );

  const wallMs = Date.now() - startedAt;
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? 0;

  const report = {
    timestamp: new Date().toISOString(),
    scenario: 'concurrent_meeting_processing',
    concurrency: options.concurrency,
    ai_use_mock: process.env.AI_USE_MOCK === 'true',
    ai_pipeline_mode: process.env.AI_PIPELINE_MODE ?? 'monolithic',
    wall_time_ms: wallMs,
    success_count: options.concurrency - errors.length,
    failure_count: errors.length,
    success_rate: (options.concurrency - errors.length) / options.concurrency,
    latency_ms: { p50, p95, p99, min: sorted[0] ?? 0, max: sorted[sorted.length - 1] ?? 0 },
    errors: errors.slice(0, 10),
    targets: {
      success_rate_min: 1,
      p95_ms_max: 600_000,
      wall_time_ms_max: 600_000,
    },
    pass:
      errors.length === 0 &&
      p95 < 600_000 &&
      wallMs < 600_000,
  };

  const output = JSON.stringify(report, null, 2);
  console.log(output);

  if (options.outputPath) {
    const resolved = path.isAbsolute(options.outputPath)
      ? options.outputPath
      : path.resolve(process.cwd(), options.outputPath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, output);
  }

  if (options.cleanup) {
    await cleanupLoadTest(seed.workspaceId, seed.userId);
  }

  await prisma.$disconnect();
  process.exit(report.pass ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
