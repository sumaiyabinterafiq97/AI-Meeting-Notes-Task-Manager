import { llmService } from '../../../src/modules/llm';
import { circuitBreakerService } from '../../../src/modules/llm/services/circuit-breaker.service';
import { prisma } from '../../../src/config/database';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  cleanDatabase,
} from '../../helpers/db';
import { setupWorkspaceWithAuth } from '../../helpers/meeting-helper';

const dbAvailable = process.env.DATABASE_URL !== undefined;

(dbAvailable ? describe : describe.skip)('LLMService integration', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    circuitBreakerService.reset();
    await cleanDatabase();
  });

  it('completes process-meeting workflow with mock provider', async () => {
    const { workspaceId } = await setupWorkspaceWithAuth();

    const response = await llmService.complete({
      workflow: 'process-meeting',
      workspaceId,
      correlationId: 'test-correlation',
      messages: [
        { role: 'user', content: 'Meeting title: Demo\n\nTranscript:\nTeam agreed on launch.' },
      ],
      responseFormat: 'json_schema',
    });

    expect(response.provider).toBe('mock');
    const parsed = JSON.parse(response.content) as { summary: string };
    expect(parsed.summary).toContain('Demo');

    const invocations = await prisma.llmInvocation.findMany({
      where: { workspaceId },
    });
    expect(invocations).toHaveLength(1);
    expect(invocations[0]?.workflow).toBe('process-meeting');
    expect(invocations[0]?.totalTokens).toBeGreaterThan(0);

    const daily = await prisma.llmUsageDaily.findUnique({
      where: {
        workspaceId_usageDate: {
          workspaceId,
          usageDate: new Date(
            Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()),
          ),
        },
      },
    });
    expect(daily?.invocationCount).toBe(1);
  });

  it('embeds text with mock provider', async () => {
    const { workspaceId } = await setupWorkspaceWithAuth();

    const response = await llmService.embed({
      texts: ['chunk one', 'chunk two'],
      workspaceId,
    });

    expect(response.provider).toBe('mock');
    expect(response.embeddings).toHaveLength(2);
    expect(response.embeddings[0]).toHaveLength(1536);
  });
});

describe('LLMService routing', () => {
  it('resolves mock provider in test environment', () => {
    expect(llmService.resolveProvider('chat')).toBe('mock');
  });
});
