import { outputMergerService } from '../../../src/modules/agents/orchestrator/services/output-merger.service';
import type { AgentMessage } from '../../../src/modules/agents/types/agent.types';
import type { SummarizerOutput } from '../../../src/modules/agents/summarizer/types/summarizer.types';
import type { TaskExtractorOutput } from '../../../src/modules/agents/task-extractor/types/task-extractor.types';
import type { DecisionOutput } from '../../../src/modules/agents/decision/types/decision.types';
import type { RiskAnalyzerOutput } from '../../../src/modules/agents/risk-analyzer/types/risk-analyzer.types';

function baseMessage<TInput, TOutput>(
  agentType: AgentMessage<TInput, TOutput>['agentType'],
  output?: TOutput,
  status: AgentMessage<TInput, TOutput>['status'] = 'completed',
): AgentMessage<TInput, TOutput> {
  return {
    id: 'msg-1',
    correlationId: 'corr-1',
    agentType,
    workspaceId: 'ws-1',
    input: {} as TInput,
    output,
    status,
    metrics: {
      startedAt: new Date().toISOString(),
      promptTokens: 100,
      completionTokens: 50,
    },
  };
}

describe('output-merger', () => {
  it('merges successful agent outputs into pipeline result', () => {
    const merged = outputMergerService.merge(
      baseMessage<'summarizer', SummarizerOutput>('summarizer', {
        summary: 'Team aligned on timeline.',
        keyTopics: ['Planning'],
      }),
      baseMessage<'task-extractor', TaskExtractorOutput>('task-extractor', {
        actionItems: [
          {
            title: 'Follow up',
            description: 'Contact vendor',
            suggestedAssignee: null,
            suggestedDueDate: null,
          },
        ],
      }),
      baseMessage<'decision', DecisionOutput>('decision', {
        decisions: [{ text: 'Ship Friday', context: 'Consensus' }],
      }),
      baseMessage<'risk-analyzer', RiskAnalyzerOutput>('risk-analyzer', {
        risks: [{ text: 'Vendor delay', severity: 'medium', context: 'API' }],
      }),
    );

    expect(merged.partialFailure).toBe(false);
    expect(merged.summary).toBe('Team aligned on timeline.');
    expect(merged.topics).toEqual(['Planning']);
    expect(merged.actionItems).toHaveLength(1);
    expect(merged.decisions).toHaveLength(1);
    expect(merged.risks).toHaveLength(1);
    expect(merged.promptTokens).toBe(400);
    expect(merged.completionTokens).toBe(200);
  });

  it('uses fallbacks when an agent fails', () => {
    const merged = outputMergerService.merge(
      baseMessage<'summarizer', SummarizerOutput>('summarizer', undefined, 'failed'),
      baseMessage<'task-extractor', TaskExtractorOutput>('task-extractor', { actionItems: [] }),
      baseMessage<'decision', DecisionOutput>('decision', { decisions: [] }),
      baseMessage<'risk-analyzer', RiskAnalyzerOutput>('risk-analyzer', { risks: [] }),
    );

    expect(merged.partialFailure).toBe(true);
    expect(merged.summary).toContain('failed');
    expect(merged.topics).toEqual([]);
  });
});
