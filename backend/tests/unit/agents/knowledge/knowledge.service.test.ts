import { agentExecutionService } from '../../../../src/modules/agents/services/agent-execution.service';
import {
  knowledgeAgent,
  buildKnowledgeMessage,
} from '../../../../src/modules/agents/knowledge/services/knowledge.service';

describe('knowledge agent service', () => {
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
    const message = buildKnowledgeMessage({
      workspaceId,
      meetingId,
      transcript: '  ',
      summary: 'Summary',
      decisions: [],
    });

    const result = await knowledgeAgent.execute(message);

    expect(result.status).toBe('completed');
    expect(result.output?.entries).toEqual([]);
    expect(result.output?.averageConfidence).toBe(1);
    expect(result.metrics.model).toBe('none');
    expect(result.metrics.promptTokens).toBe(0);
  });
});
