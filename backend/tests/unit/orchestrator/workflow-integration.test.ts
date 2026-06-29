import { orchestratorService } from '../../../src/modules/orchestrator/orchestrator.service';
import { pipelineOrchestrator } from '../../../src/modules/agents/orchestrator/pipeline-orchestrator.service';

const mockOutput = {
  result: {
    summary: 'Graph summary',
    topics: ['Planning'],
    decisions: [],
    risks: [],
    actionItems: [],
  },
  modelVersion: 'multi-agent-graph',
  promptTokens: 100,
  completionTokens: 50,
  rawResponse: { mode: 'multi-agent-graph' },
  partialFailure: false,
};

describe('pipeline orchestrator integration', () => {
  const input = {
    transcript: 'We agreed to ship Friday.',
    meetingTitle: 'Sprint',
    meetingDate: '2026-06-20',
    attendees: ['Alex'],
    memberNames: ['Alex'],
    workspaceId: '00000000-0000-4000-8000-000000000001',
    meetingId: '00000000-0000-4000-8000-000000000002',
    jobId: '00000000-0000-4000-8000-000000000003',
    correlationId: '00000000-0000-4000-8000-000000000003',
  };

  it('delegates multi-agent mode to graph orchestrator service', async () => {
    const spy = jest
      .spyOn(orchestratorService, 'runMeetingIntelligence')
      .mockResolvedValue(mockOutput);

    const output = await pipelineOrchestrator.runMultiAgent(input);

    expect(spy).toHaveBeenCalledWith(input);
    expect(output.result.summary).toBe('Graph summary');
    expect(output.modelVersion).toBe('multi-agent-graph');

    spy.mockRestore();
  });
});
