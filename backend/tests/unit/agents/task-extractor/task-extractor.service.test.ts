import { agentExecutionService } from '../../../../src/modules/agents/services/agent-execution.service';
import {
  taskExtractorAgent,
  buildTaskExtractorMessage,
} from '../../../../src/modules/agents/task-extractor/services/task-extractor.service';

describe('task-extractor agent service', () => {
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
    const message = buildTaskExtractorMessage(
      {
        transcript: '  ',
        memberNames: ['Sarah'],
      },
      workspaceId,
      { meetingId, correlationId: 'empty-task' },
    );

    const result = await taskExtractorAgent.execute(message);

    expect(result.status).toBe('completed');
    expect(result.output?.actionItems).toEqual([]);
    expect(result.output?.averageConfidence).toBe(1);
    expect(result.metrics.model).toBe('none');
    expect(result.metrics.promptTokens).toBe(0);
  });
});
