import { providerRegistry } from '../src/modules/llm';
import { promptRegistry } from '../src/modules/prompts';
import { queueRegistry, QUEUE_NAMES } from '../src/modules/jobs';
import { costTrackerService } from '../src/modules/observability';
import { prisma } from '../src/config/database';
import type { LLMProviderId } from '../src/modules/llm';
import type { PromptTemplate } from '../src/modules/prompts';

describe('MeetingMind AI — LLM Provider Registry', () => {
  it('registers all planned providers', () => {
    const ids = providerRegistry.list().map((p) => p.id as LLMProviderId);
    expect(ids).toContain('openai');
    expect(ids).toContain('anthropic');
    expect(ids).toContain('google');
    expect(ids).toContain('local');
    expect(ids).toContain('mock');
  });

  it('mock provider passes health check', async () => {
    const mock = providerRegistry.getOrThrow('mock');
    await expect(mock.healthCheck()).resolves.toBe(true);
  });
});

describe('MeetingMind AI — Prompt Registry', () => {
  it('loads prompt templates from disk', () => {
    promptRegistry.loadFromDisk();
    const templates = promptRegistry.list();
    expect(templates.length).toBeGreaterThanOrEqual(8);
    expect(templates.some((t: PromptTemplate) => t.id === 'summarizer')).toBe(true);
  });
});

describe('MeetingMind AI — Job Queue Registry', () => {
  it('defines embed-meeting, weekly-report, transcribe-audio, and calendar-sync queues', () => {
    expect(queueRegistry.isRegistered(QUEUE_NAMES.EMBED_MEETING)).toBe(true);
    expect(queueRegistry.isRegistered(QUEUE_NAMES.WEEKLY_REPORT)).toBe(true);
    expect(queueRegistry.isRegistered(QUEUE_NAMES.TRANSCRIBE_AUDIO)).toBe(true);
    expect(queueRegistry.isRegistered(QUEUE_NAMES.CALENDAR_SYNC)).toBe(true);
  });
});

describe('MeetingMind AI — Cost Tracker', () => {
  it('estimates cost for gpt-4o-mini', () => {
    const cost = costTrackerService.estimate('gpt-4o-mini', 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });
});

describe('MeetingMind AI — Database Schema', () => {
  it('exposes Prisma models for Phase 0 tables', () => {
    expect(prisma.documentChunk).toBeDefined();
    expect(prisma.embeddingJob).toBeDefined();
    expect(prisma.llmInvocation).toBeDefined();
    expect(prisma.llmUsageDaily).toBeDefined();
    expect(prisma.agentExecution).toBeDefined();
    expect(prisma.chatSession).toBeDefined();
    expect(prisma.chatMessage).toBeDefined();
    expect(prisma.knowledgeEntry).toBeDefined();
    expect(prisma.workspaceReport).toBeDefined();
    expect(prisma.meetingAudio).toBeDefined();
    expect(prisma.calendarConnection).toBeDefined();
    expect(prisma.calendarSyncedEvent).toBeDefined();
  });
});
