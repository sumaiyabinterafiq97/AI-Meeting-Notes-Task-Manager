import type { MeetingIntelligenceState } from '../state/graph-state.types';
import { executeNode } from '../executors/node-executor';
import {
  riskAnalyzerAgent,
  buildRiskAnalyzerMessage,
} from '../../agents/risk-analyzer/services/risk-analyzer.service';
import type { SummarizerOutput } from '../../agents/summarizer/types/summarizer.types';
import type { DecisionOutput } from '../../agents/decision/types/decision.types';
import type { GraphNodeFn, PartialGraphStateUpdate } from './node.types';
import type { MeetingPipelineInput } from '../../agents/orchestrator/types/pipeline.types';

export const riskNode: GraphNodeFn<MeetingIntelligenceState> = async (state) => {
  if (state.agentResults['risk-analyzer']?.status === 'completed') {
    return {};
  }

  const hasParallelInputs =
    state.agentResults.summarizer &&
    state.agentResults['task-extractor'] &&
    state.agentResults.decision;
  if (!hasParallelInputs) {
    return {};
  }

  return executeNode({
    nodeId: 'risk',
    agentType: 'risk-analyzer',
    state,
    fn: async (): Promise<PartialGraphStateUpdate> => {
      const input = state.input as MeetingPipelineInput;
      const agentOptions = {
        meetingId: input.meetingId,
        correlationId: input.correlationId,
        jobId: input.jobId,
      };
      const summaryContext = (state.agentResults.summarizer?.output as SummarizerOutput | undefined)
        ?.summary;
      const decisionContext = (state.agentResults.decision?.output as DecisionOutput | undefined)
        ?.decisions;

      const result = await riskAnalyzerAgent.execute(
        buildRiskAnalyzerMessage(
          {
            transcript: input.transcript,
            summary: summaryContext,
            decisions: decisionContext,
            meetingDate: input.meetingDate,
            tags: input.tags,
          },
          input.workspaceId,
          agentOptions,
        ),
      );
      return {
        agentResults: { 'risk-analyzer': result },
        metrics: {
          promptTokens: result.metrics.promptTokens ?? 0,
          completionTokens: result.metrics.completionTokens ?? 0,
        },
      };
    },
  });
};
