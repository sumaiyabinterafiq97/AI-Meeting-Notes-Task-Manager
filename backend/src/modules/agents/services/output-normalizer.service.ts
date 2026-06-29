import type { SummarizerOutput } from '../summarizer/types/summarizer.types';
import type { TaskExtractorOutput } from '../task-extractor/types/task-extractor.types';
import { stripTaskExtractorForMerge } from '../task-extractor/services/task-extractor.validator';
import { stripDecisionForMerge } from '../decision/services/decision.validator';
import { stripRiskAnalyzerForMerge } from '../risk-analyzer/services/risk-analyzer.validator';
import { stripWeeklyReportForMerge } from '../weekly-report/services/weekly-report.validator';
import { stripKnowledgeForMerge } from '../knowledge/services/knowledge.validator';
import type { DecisionOutput } from '../decision/types/decision.types';
import type { RiskAnalyzerOutput } from '../risk-analyzer/types/risk-analyzer.types';
import type { WeeklyReportOutput } from '../weekly-report/types/weekly-report.types';
import type { KnowledgeOutput } from '../knowledge/types/knowledge.types';
import type { ChatAgentOutput } from '../chat/types/chat-agent.types';
import { stripChatCitationsForMerge } from '../chat/services/chat-agent.validator';
import { isSchemaV21Enabled } from '../schemas/schema-resolver';
import type { DecisionOutputV20, DecisionOutputV21 } from '../schemas/zod-schemas';
import type { RiskAnalyzerOutputV20, RiskAnalyzerOutputV21 } from '../schemas/zod-schemas';
import type { TaskExtractorOutputV20, TaskExtractorOutputV21 } from '../schemas/zod-schemas';
import type { KnowledgeOutputV20, KnowledgeOutputV21 } from '../schemas/zod-schemas';

const TASK_CONFIDENCE_THRESHOLD = 0.7;
const DECISION_CONFIDENCE_THRESHOLD = 0.6;
const RISK_CONFIDENCE_THRESHOLD = 0.65;
const KNOWLEDGE_CONFIDENCE_THRESHOLD = 0.5;

export interface NormalizeOptions {
  useV21?: boolean;
}

function resolveV21(options?: NormalizeOptions): boolean {
  return options?.useV21 ?? isSchemaV21Enabled();
}

export function normalizeTaskExtractorOutputForMerge(
  output: TaskExtractorOutput,
): TaskExtractorOutput {
  return stripTaskExtractorForMerge(output);
}

/** @deprecated Use normalizeTaskExtractorOutputForMerge */
export function normalizeTaskExtractorOutput(
  output: TaskExtractorOutputV20 | TaskExtractorOutputV21,
  options?: NormalizeOptions,
): TaskExtractorOutputV20 {
  if (!resolveV21(options)) {
    return output as TaskExtractorOutputV20;
  }

  const v21 = output as TaskExtractorOutputV21;
  return {
    actionItems: v21.actionItems
      .filter((item) => item.confidenceScore >= TASK_CONFIDENCE_THRESHOLD)
      .map(({ title, description, suggestedAssignee, suggestedDueDate }) => ({
        title,
        description,
        suggestedAssignee,
        suggestedDueDate,
      })),
  };
}

export function normalizeDecisionOutputForMerge(output: DecisionOutput): DecisionOutput {
  return stripDecisionForMerge(output);
}

/** @deprecated Use normalizeDecisionOutputForMerge */
export function normalizeDecisionOutput(
  output: DecisionOutputV20 | DecisionOutputV21,
  options?: NormalizeOptions,
): DecisionOutputV20 {
  if (!resolveV21(options)) {
    return output as DecisionOutputV20;
  }

  const v21 = output as DecisionOutputV21;
  return {
    decisions: v21.decisions
      .filter((item) => item.confidenceScore >= DECISION_CONFIDENCE_THRESHOLD)
      .map(({ text, context }) => ({ text, context })),
  };
}

export function normalizeRiskAnalyzerOutputForMerge(
  output: RiskAnalyzerOutput,
): RiskAnalyzerOutput {
  return stripRiskAnalyzerForMerge(output);
}

/** @deprecated Use normalizeRiskAnalyzerOutputForMerge */
export function normalizeRiskAnalyzerOutput(
  output: RiskAnalyzerOutputV20 | RiskAnalyzerOutputV21,
  options?: NormalizeOptions,
): RiskAnalyzerOutputV20 {
  if (!resolveV21(options)) {
    return output as RiskAnalyzerOutputV20;
  }

  const v21 = output as RiskAnalyzerOutputV21;
  return {
    risks: v21.risks
      .filter((item) => item.confidenceScore >= RISK_CONFIDENCE_THRESHOLD)
      .map(({ text, severity, context }) => ({ text, severity, context })),
  };
}

export function normalizeChatOutputForMerge(output: ChatAgentOutput): ChatAgentOutput {
  return {
    content: output.content,
    citations: stripChatCitationsForMerge(output.citations),
    grounded: output.grounded,
    refusalReason: output.refusalReason,
  };
}

export function normalizeWeeklyReportOutputForMerge(
  output: WeeklyReportOutput,
): WeeklyReportOutput {
  return stripWeeklyReportForMerge(output);
}

export function normalizeKnowledgeOutputForMerge(output: KnowledgeOutput): KnowledgeOutput {
  return stripKnowledgeForMerge(output);
}

/** @deprecated Use normalizeKnowledgeOutputForMerge */
export function normalizeKnowledgeOutput(
  output: KnowledgeOutputV20 | KnowledgeOutputV21,
  options?: NormalizeOptions,
): KnowledgeOutputV20 {
  if (!resolveV21(options)) {
    return output as KnowledgeOutputV20;
  }

  const v21 = output as KnowledgeOutputV21;
  return {
    entries: v21.entries
      .filter((entry) => entry.confidence >= KNOWLEDGE_CONFIDENCE_THRESHOLD)
      .map(({ entityType, title, content, confidence }) => ({
        entityType,
        title,
        content,
        confidence,
      })),
  };
}

export function normalizeSummarizerOutputForMerge(
  output: SummarizerOutput,
): Pick<SummarizerOutput, 'summary' | 'keyTopics'> {
  return {
    summary: output.summary,
    keyTopics: output.keyTopics,
  };
}

/** @deprecated Use normalizeSummarizerOutputForMerge — kept for barrel export compatibility */
export function normalizeSummarizerOutput(output: SummarizerOutput): SummarizerOutput {
  return output;
}
