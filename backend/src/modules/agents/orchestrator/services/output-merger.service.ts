import type { SummarizerOutput } from '../../summarizer/types/summarizer.types';
import type { TaskExtractorOutput } from '../../task-extractor/types/task-extractor.types';
import { stripTaskExtractorForMerge } from '../../task-extractor/services/task-extractor.validator';
import { stripDecisionForMerge } from '../../decision/services/decision.validator';
import { stripRiskAnalyzerForMerge } from '../../risk-analyzer/services/risk-analyzer.validator';
import type { DecisionOutput } from '../../decision/types/decision.types';
import type { RiskAnalyzerOutput } from '../../risk-analyzer/types/risk-analyzer.types';
import type { AgentMessage } from '../../types/agent.types';
import type { ExtractionAgentResults } from '../types/pipeline.types';

const FAILED_SUMMARY = 'Summary generation failed. Other meeting insights may still be available.';

export class OutputMergerService {
  merge(
    summarizer: AgentMessage<unknown, SummarizerOutput>,
    taskExtractor: AgentMessage<unknown, TaskExtractorOutput>,
    decision: AgentMessage<unknown, DecisionOutput>,
    riskAnalyzer: AgentMessage<unknown, RiskAnalyzerOutput>,
  ): ExtractionAgentResults {
    const partialFailure =
      summarizer.status === 'failed' ||
      taskExtractor.status === 'failed' ||
      decision.status === 'failed' ||
      riskAnalyzer.status === 'failed';

    const summary =
      summarizer.status === 'completed' && summarizer.output?.summary
        ? summarizer.output.summary
        : FAILED_SUMMARY;

    const topics =
      summarizer.status === 'completed' && summarizer.output?.keyTopics
        ? summarizer.output.keyTopics
        : [];

    const decisions =
      decision.status === 'completed' && decision.output?.decisions
        ? stripDecisionForMerge(decision.output).decisions
        : [];

    const risks =
      riskAnalyzer.status === 'completed' && riskAnalyzer.output?.risks
        ? stripRiskAnalyzerForMerge(riskAnalyzer.output).risks
        : [];

    const actionItems =
      taskExtractor.status === 'completed' && taskExtractor.output?.actionItems
        ? stripTaskExtractorForMerge(taskExtractor.output).actionItems
        : [];

    const promptTokens =
      (summarizer.metrics.promptTokens ?? 0) +
      (taskExtractor.metrics.promptTokens ?? 0) +
      (decision.metrics.promptTokens ?? 0) +
      (riskAnalyzer.metrics.promptTokens ?? 0);

    const completionTokens =
      (summarizer.metrics.completionTokens ?? 0) +
      (taskExtractor.metrics.completionTokens ?? 0) +
      (decision.metrics.completionTokens ?? 0) +
      (riskAnalyzer.metrics.completionTokens ?? 0);

    return {
      summary,
      topics,
      decisions,
      risks,
      actionItems,
      promptTokens,
      completionTokens,
      partialFailure,
      agentDetails: {
        summarizer: {
          status: summarizer.status,
          error: summarizer.error?.message,
          nextSteps: summarizer.output?.nextSteps ?? [],
          participantsDiscussed: summarizer.output?.participantsDiscussed ?? [],
          confidenceScore: summarizer.output?.confidenceScore,
          citationCount: summarizer.output?.citations?.length ?? 0,
        },
        'task-extractor': {
          status: taskExtractor.status,
          error: taskExtractor.error?.message,
          itemCount: taskExtractor.output?.actionItems.length ?? 0,
          filteredCount: taskExtractor.output?.filteredCount ?? 0,
          averageConfidence: taskExtractor.output?.averageConfidence,
        },
        decision: {
          status: decision.status,
          error: decision.error?.message,
          itemCount: decision.output?.decisions.length ?? 0,
          filteredCount: decision.output?.filteredCount ?? 0,
          averageConfidence: decision.output?.averageConfidence,
        },
        'risk-analyzer': {
          status: riskAnalyzer.status,
          error: riskAnalyzer.error?.message,
          itemCount: riskAnalyzer.output?.risks.length ?? 0,
          filteredCount: riskAnalyzer.output?.filteredCount ?? 0,
          averageConfidence: riskAnalyzer.output?.averageConfidence,
        },
      },
    };
  }
}

export const outputMergerService = new OutputMergerService();
