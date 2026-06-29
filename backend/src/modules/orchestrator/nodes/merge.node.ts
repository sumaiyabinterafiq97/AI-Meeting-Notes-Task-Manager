import type { MeetingIntelligenceState } from '../state/graph-state.types';
import { outputMergerService } from '../../agents/orchestrator/services/output-merger.service';
import type { SummarizerOutput } from '../../agents/summarizer/types/summarizer.types';
import type { TaskExtractorOutput } from '../../agents/task-extractor/types/task-extractor.types';
import type { DecisionOutput } from '../../agents/decision/types/decision.types';
import type { RiskAnalyzerOutput } from '../../agents/risk-analyzer/types/risk-analyzer.types';
import type { AgentMessage } from '../../agents/types/agent.types';
import type { GraphNodeFn } from './node.types';

export const mergeNode: GraphNodeFn<MeetingIntelligenceState> = async (state) => {
  // Fan-in: LangGraph may invoke merge when any upstream node completes.
  const summarizerResult = state.agentResults.summarizer;
  const taskResult = state.agentResults['task-extractor'];
  const decisionResult = state.agentResults.decision;
  const riskResult = state.agentResults['risk-analyzer'];

  if (summarizerResult?.status === 'failed') {
    return { status: 'failed' };
  }

  if (!summarizerResult || !taskResult || !decisionResult || !riskResult) {
    return {};
  }

  const summarizer = summarizerResult;
  const taskExtractor = taskResult;
  const decision = decisionResult;
  const riskAnalyzer = riskResult;

  const merged = outputMergerService.merge(
    summarizer as AgentMessage<unknown, SummarizerOutput>,
    taskExtractor as AgentMessage<unknown, TaskExtractorOutput>,
    decision as AgentMessage<unknown, DecisionOutput>,
    riskAnalyzer as AgentMessage<unknown, RiskAnalyzerOutput>,
  );

  const summarizerFailed = summarizer.status === 'failed';
  const status = summarizerFailed ? 'failed' : merged.partialFailure ? 'partial' : 'running';

  return {
    merged,
    status,
    pipelineOutput: {
      result: {
        summary: merged.summary,
        topics: merged.topics,
        decisions: merged.decisions,
        risks: merged.risks,
        actionItems: merged.actionItems,
      },
      modelVersion: 'multi-agent-graph',
      promptTokens: merged.promptTokens,
      completionTokens: merged.completionTokens,
      rawResponse: { mode: 'multi-agent-graph', agents: merged.agentDetails },
      partialFailure: merged.partialFailure,
    },
  };
};
