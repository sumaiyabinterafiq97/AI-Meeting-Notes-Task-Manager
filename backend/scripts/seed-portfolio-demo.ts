#!/usr/bin/env node
/**
 * Seeds portfolio demo data: transcript + AI processing for screenshot capture.
 * Usage: npm run seed:portfolio-demo --prefix backend
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { MeetingStatus } from '@prisma/client';
import { prisma } from '../src/config/database';
import { aiJobService } from '../src/jobs/ai-job.service';
import { meetingRepository } from '../src/modules/meetings/meeting.repository';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TRANSCRIPT_PATH = path.resolve(__dirname, '../../docs/demo/portfolio-demo-transcript.txt');

const DEMO_MEETING = {
  title: 'Sprint Planning — Q2 Roadmap',
  attendees: ['Alex Chen', 'Jordan Park', 'Maria Santos', 'Sarah Kim'],
};

async function findTargetMeeting() {
  const meeting = await prisma.meeting.findFirst({
    where: {
      deletedAt: null,
      title: { contains: 'Sprint Planning', mode: 'insensitive' },
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      workspace: { select: { id: true, name: true } },
    },
  });

  if (meeting) {
    return meeting;
  }

  const workspace = await prisma.workspace.findFirst({
    where: { deletedAt: null },
    orderBy: { updatedAt: 'desc' },
  });

  if (!workspace) {
    throw new Error('No workspace found. Log in at http://localhost:5173 and create a workspace first.');
  }

  return prisma.meeting.create({
    data: {
      workspaceId: workspace.id,
      title: DEMO_MEETING.title,
      meetingDate: new Date(),
      durationMinutes: 45,
      attendees: DEMO_MEETING.attendees,
      status: MeetingStatus.DRAFT,
      tags: ['sprint', 'planning', 'roadmap'],
    },
    include: {
      workspace: { select: { id: true, name: true } },
    },
  });
}

async function printSummary(updated: {
  id: string;
  title: string;
  status: string;
  workspace: { id: string; name: string };
  aiOutput: { processingStatus: string } | null;
  actionItems: { id: string }[];
}) {
  const workspaceId = updated.workspace.id;
  const meetingId = updated.id;
  const base = 'http://localhost:5173';

  console.log('\n✅ Portfolio demo ready\n');
  console.log('Workspace: %s (%s)', updated.workspace.name, workspaceId);
  console.log('Meeting:   %s (%s)', updated.title, meetingId);
  console.log('Status:    %s', updated.status);
  console.log('AI output: %s', updated.aiOutput?.processingStatus ?? 'none');
  console.log('Action items: %d', updated.actionItems.length);
  console.log('\nScreenshot URLs:');
  console.log('  Dashboard:  %s/workspaces/%s/dashboard', base, workspaceId);
  console.log('  Insights:   %s/workspaces/%s/meetings/%s (Insights tab)', base, workspaceId, meetingId);
  console.log('  Chat:       %s/workspaces/%s/meetings/%s (Chat tab)', base, workspaceId, meetingId);
  console.log('  Search:     %s/workspaces/%s/search?q=API+latency', base, workspaceId);
  console.log('  Tasks:      %s/workspaces/%s/tasks', base, workspaceId);
  console.log('\nArchitecture PNG: docs/demo/meetingmind-agent-pipeline.png');
}

async function main() {
  if (!fs.existsSync(TRANSCRIPT_PATH)) {
    throw new Error(`Missing transcript file: ${TRANSCRIPT_PATH}`);
  }

  const content = fs.readFileSync(TRANSCRIPT_PATH, 'utf8').trim();
  if (content.length < 100) {
    throw new Error('Transcript too short');
  }

  process.env.AI_USE_MOCK = process.env.AI_USE_MOCK ?? 'true';

  const meeting = await findTargetMeeting();

  const existing = await prisma.meeting.findUnique({
    where: { id: meeting.id },
    include: {
      workspace: { select: { id: true, name: true } },
      aiOutput: true,
      actionItems: true,
      transcript: true,
    },
  });

  const alreadyProcessed =
    existing?.aiOutput?.processingStatus === 'COMPLETED' &&
    existing.transcript?.content === content;

  if (alreadyProcessed) {
    printSummary(existing!);
    return;
  }

  await prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      title: DEMO_MEETING.title,
      attendees: DEMO_MEETING.attendees,
      status: MeetingStatus.DRAFT,
    },
  });

  await meetingRepository.upsertTranscriptAndStartProcessing(meeting.id, {
    content,
    sourceFormat: 'text',
    charCount: content.length,
  });

  console.log('Processing meeting with AI_USE_MOCK=%s ...', process.env.AI_USE_MOCK);
  await aiJobService.enqueueProcessing(meeting.workspaceId, meeting.id, {
    idempotencyKey: `portfolio-demo:${meeting.id}:${Date.now()}`,
    force: true,
  });

  const updated = await prisma.meeting.findUnique({
    where: { id: meeting.id },
    include: {
      workspace: { select: { id: true, name: true } },
      aiOutput: true,
      actionItems: true,
    },
  });

  printSummary(updated!);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
