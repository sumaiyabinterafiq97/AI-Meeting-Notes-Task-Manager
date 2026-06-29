import { agentExecutionService } from '../../../../src/modules/agents/services/agent-execution.service';
import { summarizerAgent, buildSummarizerMessage } from '../../../../src/modules/agents/summarizer/services/summarizer.service';
import { EMPTY_TRANSCRIPT_SUMMARY } from '../../../../src/modules/agents/summarizer/services/summarizer.constants';

describe('summarizer agent service', () => {
  const workspaceId = '00000000-0000-0000-0000-000000000001';
  const meetingId = '00000000-0000-0000-0000-000000000002';

  beforeEach(() => {
    jest.spyOn(agentExecutionService, 'start').mockResolvedValue({ id: 'exec-1' } as never);
    jest.spyOn(agentExecutionService, 'complete').mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('short-circuits empty transcript without LLM call', async () => {
    const message = buildSummarizerMessage(
      {
        transcript: '   ',
        meetingTitle: 'Standup',
        memberNames: ['Alex'],
        meetingDate: '2026-06-16',
      },
      workspaceId,
      { meetingId, correlationId: 'empty-correlation' },
    );

    const result = await summarizerAgent.execute(message);

    expect(result.status).toBe('completed');
    expect(result.output?.summary).toBe(EMPTY_TRANSCRIPT_SUMMARY);
    expect(result.output?.keyTopics).toEqual([]);
    expect(result.output?.confidenceScore).toBe(1);
    expect(result.metrics.model).toBe('none');
    expect(result.metrics.promptTokens).toBe(0);
  });
});
