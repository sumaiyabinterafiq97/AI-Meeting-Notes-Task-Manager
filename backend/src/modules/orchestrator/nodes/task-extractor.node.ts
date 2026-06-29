import type { MeetingIntelligenceState } from '../state/graph-state.types';
import { executeNode } from '../executors/node-executor';
import {
  taskExtractorAgent,
  buildTaskExtractorMessage,
} from '../../agents/task-extractor/services/task-extractor.service';
import type { GraphNodeFn, PartialGraphStateUpdate } from './node.types';
import type { MeetingPipelineInput } from '../../agents/orchestrator/types/pipeline.types';

export const taskExtractorNode: GraphNodeFn<MeetingIntelligenceState> = async (state) => {
  return executeNode({
    nodeId: 'task_extractor',
    agentType: 'task-extractor',
    state,
    fn: async (): Promise<PartialGraphStateUpdate> => {
      const input = state.input as MeetingPipelineInput;
      const agentOptions = {
        meetingId: input.meetingId,
        correlationId: input.correlationId,
        jobId: input.jobId,
      };
      const result = await taskExtractorAgent.execute(
        buildTaskExtractorMessage(
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
        agentResults: { 'task-extractor': result },
        metrics: {
          promptTokens: result.metrics.promptTokens ?? 0,
          completionTokens: result.metrics.completionTokens ?? 0,
        },
      };
    },
  });
};
