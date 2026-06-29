import { graphExecutorService } from '../executors/graph-executor.service';
import { getWorkflowDefinition } from '../workflows/workflow.types';
import { meetingIntelligenceNodes } from '../nodes';
import type { MeetingIntelligenceState } from '../state/graph-state.types';
import { createInitialState } from '../state/reducers';
import type { MeetingPipelineInput } from '../../agents/orchestrator/types/pipeline.types';

export function buildMeetingIntelligenceGraph() {
  const definition = getWorkflowDefinition('meeting-intelligence');
  return graphExecutorService.buildGraph(definition, meetingIntelligenceNodes);
}

export function createMeetingIntelligenceState(
  input: MeetingPipelineInput,
): MeetingIntelligenceState {
  return {
    workflowId: 'meeting-intelligence',
    correlationId: input.correlationId,
    workspaceId: input.workspaceId,
    meetingId: input.meetingId,
    jobId: input.jobId,
    status: 'pending',
    input: input as MeetingPipelineInput & Record<string, unknown>,
    agentResults: {},
    errors: [],
    metrics: createInitialState({
      workflowId: 'meeting-intelligence',
      correlationId: input.correlationId,
      workspaceId: input.workspaceId,
      input: input as unknown as Record<string, unknown>,
    }).metrics,
    tokenBudget: createInitialState({
      workflowId: 'meeting-intelligence',
      correlationId: input.correlationId,
      workspaceId: input.workspaceId,
      input: input as unknown as Record<string, unknown>,
    }).tokenBudget,
  };
}

export async function runMeetingIntelligenceGraph(
  input: MeetingPipelineInput,
  options?: { threadId?: string },
): Promise<MeetingIntelligenceState> {
  const definition = getWorkflowDefinition('meeting-intelligence');
  const initialState = createMeetingIntelligenceState(input);
  return graphExecutorService.invoke(definition, meetingIntelligenceNodes, initialState, {
    threadId: options?.threadId ?? input.correlationId,
  });
}
