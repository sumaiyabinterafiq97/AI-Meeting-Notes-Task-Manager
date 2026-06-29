import type { MeetingIntelligenceState } from '../state/graph-state.types';
import { executeNode } from '../executors/node-executor';
import { knowledgeAgent, buildKnowledgeMessage } from '../../agents/knowledge/services/knowledge.service';
import type { GraphNodeFn, PartialGraphStateUpdate } from './node.types';
import type { MeetingPipelineInput } from '../../agents/orchestrator/types/pipeline.types';
import { orchestratorEventBus } from '../events/event-bus.service';

export const knowledgeNode: GraphNodeFn<MeetingIntelligenceState> = async (state) => {
  if (state.status === 'failed' || !state.merged) {
    return { status: state.status };
  }

  return executeNode({
    nodeId: 'knowledge',
    agentType: 'knowledge',
    state,
    fn: async (): Promise<PartialGraphStateUpdate> => {
      const input = state.input as MeetingPipelineInput;

      const result = await knowledgeAgent.execute(
        buildKnowledgeMessage(
          {
            workspaceId: input.workspaceId,
            meetingId: input.meetingId,
            transcript: input.transcript,
            summary: state.merged!.summary,
            decisions: state.merged!.decisions,
            meetingTitle: input.meetingTitle,
            correlationId: input.correlationId,
            jobId: input.jobId,
          },
          { correlationId: input.correlationId },
        ),
      );

      await orchestratorEventBus.emit(
        orchestratorEventBus.createEvent('KnowledgeUpdated', {
          workflowId: 'meeting-intelligence',
          correlationId: state.correlationId,
          workspaceId: state.workspaceId,
          meetingId: input.meetingId,
          payload: {
            entryCount: (result.output as { entries?: unknown[] } | undefined)?.entries?.length ?? 0,
          },
        }),
      );

      return {
        agentResults: { knowledge: result },
        status: state.pipelineOutput?.partialFailure ? 'partial' : 'completed',
        metrics: {
          completedAt: new Date().toISOString(),
          promptTokens: result.metrics.promptTokens ?? 0,
          completionTokens: result.metrics.completionTokens ?? 0,
        },
      };
    },
  });
};
