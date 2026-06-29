import type { MeetingIntelligenceState } from '../state/graph-state.types';
import { executeNode } from '../executors/node-executor';
import { decisionAgent, buildDecisionMessage } from '../../agents/decision/services/decision.service';
import type { GraphNodeFn, PartialGraphStateUpdate } from './node.types';
import type { MeetingPipelineInput } from '../../agents/orchestrator/types/pipeline.types';

export const decisionNode: GraphNodeFn<MeetingIntelligenceState> = async (state) => {
  return executeNode({
    nodeId: 'decision',
    agentType: 'decision',
    state,
    fn: async (): Promise<PartialGraphStateUpdate> => {
      const input = state.input as MeetingPipelineInput;
      const agentOptions = {
        meetingId: input.meetingId,
        correlationId: input.correlationId,
        jobId: input.jobId,
      };
      const result = await decisionAgent.execute(
        buildDecisionMessage(
          {
            transcript: input.transcript,
            memberNames: input.memberNames,
            meetingDate: input.meetingDate,
          },
          input.workspaceId,
          agentOptions,
        ),
      );
      return {
        agentResults: { decision: result },
        metrics: {
          promptTokens: result.metrics.promptTokens ?? 0,
          completionTokens: result.metrics.completionTokens ?? 0,
        },
      };
    },
  });
};
