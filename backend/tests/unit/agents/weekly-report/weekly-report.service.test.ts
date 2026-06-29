import { agentExecutionService } from '../../../../src/modules/agents/services/agent-execution.service';
import * as structuredOutputService from '../../../../src/modules/agents/schemas/structured-output.service';
import { ragService } from '../../../../src/modules/rag/services/rag.service';
import { promptRegistry } from '../../../../src/modules/prompts/services/prompt-registry.service';
import {
  weeklyReportAgent,
  buildWeeklyReportMessage,
} from '../../../../src/modules/agents/weekly-report/services/weekly-report.service';
import { mockRagContext } from '../../../helpers/rag-context';

describe('weekly-report agent service', () => {
  const workspaceId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    jest.spyOn(agentExecutionService, 'start').mockResolvedValue({ id: 'exec-1' } as never);
    jest.spyOn(agentExecutionService, 'complete').mockResolvedValue(undefined as never);
    jest.spyOn(agentExecutionService, 'fail').mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('short-circuits zero-meeting periods without LLM call', async () => {
    const result = await weeklyReportAgent.generate(
      {
        workspaceId,
        dateFrom: '2026-06-09',
        dateTo: '2026-06-15',
        correlationId: 'weekly-empty',
      },
      {
        meetingSummaries: '',
        taskStats: { created: 0, completed: 0, open: 0, overdue: 0 },
        openRisks: '',
        meetingCount: 0,
      },
    );

    expect(result.model).toBe('none');
    expect(result.promptTokens).toBe(0);
    expect(result.output.meetingCount).toBe(0);
    expect(result.output.sections[0].heading).toBe('Summary');
  });

  it('execute completes with context from input fields', async () => {
    jest.spyOn(weeklyReportAgent, 'generate').mockResolvedValue({
      output: {
        title: 'Weekly Report',
        sections: [{ heading: 'Summary', content: 'Done' }],
        taskStats: { created: 1, completed: 1, open: 0, overdue: 0 },
        meetingCount: 1,
      },
      model: 'mock',
      provider: 'mock',
      promptTokens: 100,
      completionTokens: 50,
    });

    const message = buildWeeklyReportMessage({
      workspaceId,
      dateFrom: '2026-06-09',
      dateTo: '2026-06-15',
      meetingCount: 1,
      taskStats: { created: 1, completed: 1, open: 0, overdue: 0 },
    });

    const result = await weeklyReportAgent.execute(message);

    expect(result.status).toBe('completed');
    expect(result.output?.title).toBe('Weekly Report');
    expect(result.metrics.promptTokens).toBe(100);
  });

  it('loads RAG context with weekly budget and period date filters', async () => {
    const buildContext = jest.spyOn(ragService, 'buildContext').mockResolvedValue(
      mockRagContext({
        blocks: [
          {
            citationIndex: 1,
            chunkId: 'chunk-1',
            content: 'Closed three support tickets.',
            meetingId: 'm1',
            metadata: { meetingTitle: 'Weekly Sync' },
          },
        ],
        totalTokens: 120,
        useCase: 'weekly',
      }),
    );

    jest.spyOn(promptRegistry, 'render').mockReturnValue({
      id: 'weekly-report',
      messages: [{ role: 'system', content: 'Weekly report system prompt' }],
      version: '1.0.0',
    });

    jest.spyOn(structuredOutputService, 'completeStructured').mockResolvedValue({
      response: {
        content: JSON.stringify({
          title: 'Weekly Report',
          sections: [{ heading: 'Summary', content: 'Good week.' }],
          taskStats: { created: 1, completed: 1, open: 0, overdue: 0 },
          meetingCount: 2,
        }),
        promptTokens: 500,
        completionTokens: 200,
        model: 'mock',
        provider: 'mock',
        finishReason: 'stop',
      },
      parsed: {
        title: 'Weekly Report',
        sections: [{ heading: 'Summary', content: 'Good week.' }],
        taskStats: { created: 1, completed: 1, open: 0, overdue: 0 },
        meetingCount: 2,
      },
    });

    await weeklyReportAgent.generate(
      {
        workspaceId,
        dateFrom: '2026-06-09',
        dateTo: '2026-06-15',
        correlationId: 'weekly-rag',
      },
      {
        meetingSummaries: 'Two meetings held.',
        taskStats: { created: 1, completed: 1, open: 0, overdue: 0 },
        openRisks: '',
        meetingCount: 2,
      },
    );

    expect(buildContext).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId,
        dateFrom: '2026-06-09',
        dateTo: '2026-06-15T23:59:59.999Z',
        mode: 'hybrid',
        topK: 25,
      }),
      { useCase: 'weekly' },
    );
  });
});
