import type { MeetingIntelligenceState } from '../state/graph-state.types';
import { executeNode } from '../executors/node-executor';
import { summarizerAgent, buildSummarizerMessage } from '../../agents/summarizer/services/summarizer.service';
import type { GraphNodeFn, PartialGraphStateUpdate } from './node.types';
import type { MeetingPipelineInput } from '../../agents/orchestrator/types/pipeline.types';

function getMeetingInput(state: MeetingIntelligenceState): MeetingPipelineInput {
  return state.input as MeetingPipelineInput;
}

export const summarizerNode: GraphNodeFn<MeetingIntelligenceState> = async (state) => {
  return executeNode({
    nodeId: 'summarizer',
    agentType: 'summarizer',
    state,
    fn: async (): Promise<PartialGraphStateUpdate> => {
      const input = getMeetingInput(state);
      const agentOptions = {
        meetingId: input.meetingId,
        correlationId: input.correlationId,
        jobId: input.jobId,
      };
      const message = buildSummarizerMessage(
        {
          transcript: input.transcript,
          meetingTitle: input.meetingTitle,
          memberNames: input.memberNames,
          meetingDate: input.meetingDate,
          durationMinutes: input.durationMinutes,
        },
        input.workspaceId,
        agentOptions,
      );
      const result = await summarizerAgent.execute(message);
      return {
        agentResults: { summarizer: result },
        metrics: {
          promptTokens: result.metrics.promptTokens ?? 0,
          completionTokens: result.metrics.completionTokens ?? 0,
        },
      };
    },
  });
};
