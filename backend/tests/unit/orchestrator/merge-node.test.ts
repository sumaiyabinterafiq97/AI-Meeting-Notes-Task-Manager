import { mergeNode } from '../../../src/modules/orchestrator/nodes/merge.node';
import type { MeetingIntelligenceState } from '../../../src/modules/orchestrator/state/graph-state.types';
import type { AgentMessage } from '../../../src/modules/agents/types/agent.types';
import type { SummarizerOutput } from '../../../src/modules/agents/summarizer/types/summarizer.types';

function baseState(overrides: Partial<MeetingIntelligenceState> = {}): MeetingIntelligenceState {
  return {
    workflowId: 'meeting-intelligence',
    correlationId: 'corr-1',
    workspaceId: 'ws-1',
    meetingId: 'm-1',
    status: 'running',
    input: {} as MeetingIntelligenceState['input'],
    agentResults: {},
    errors: [],
    metrics: {
      startedAt: new Date().toISOString(),
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: 0,
      nodeExecutions: {},
    },
    tokenBudget: {
      workspaceBudget: 500_000,
      consumed: 0,
      reserved: 0,
      exceeded: false,
    },
    ...overrides,
  };
}

function completedMessage<TOutput>(output: TOutput): AgentMessage<unknown, TOutput> {
  return {
    id: 'msg',
    correlationId: 'corr-1',
    agentType: 'summarizer',
    workspaceId: 'ws-1',
    input: {},
    output,
    status: 'completed',
    metrics: { startedAt: new Date().toISOString(), promptTokens: 10, completionTokens: 5 },
  };
}

describe('merge node', () => {
  it('marks pipeline failed when summarizer fails', async () => {
    const result = await mergeNode(
      baseState({
        agentResults: {
          summarizer: { ...completedMessage<SummarizerOutput>({ summary: 'x', keyTopics: [] }), status: 'failed' },
        },
      }),
    );
    expect(result.status).toBe('failed');
  });

  it('produces partial status when non-critical agent fails', async () => {
    const result = await mergeNode(
      baseState({
        agentResults: {
          summarizer: completedMessage({ summary: 'Summary', keyTopics: ['A'] }),
          'task-extractor': { ...completedMessage({ actionItems: [] }), status: 'failed' },
          decision: completedMessage({ decisions: [] }),
          'risk-analyzer': completedMessage({ risks: [] }),
        },
      }),
    );
    expect(result.status).toBe('partial');
    expect(result.pipelineOutput?.partialFailure).toBe(true);
  });
});
