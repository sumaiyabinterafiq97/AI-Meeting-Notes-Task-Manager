import type { LLMCompletionRequest } from '../types/llm.types';

export interface MockMeetingAnalysis {
  summary: string;
  topics: string[];
  decisions: Array<{ text: string; context: string }>;
  risks: Array<{ text: string; severity: string; context: string }>;
  actionItems: Array<{
    title: string;
    description: string;
    suggestedAssignee: string | null;
    suggestedDueDate: string | null;
  }>;
}

export function buildMockMeetingAnalysis(userContent: string): MockMeetingAnalysis {
  const titleMatch = userContent.match(/Meeting title:\s*(.+)/i);
  const meetingTitle = titleMatch?.[1]?.trim() ?? 'Team Sync';

  return {
    summary: `Mock analysis for "${meetingTitle}". The team reviewed priorities and agreed on next steps.`,
    topics: ['Sprint planning', 'Dependencies'],
    decisions: [
      {
        text: 'Proceed with the proposed timeline',
        context: 'Consensus after reviewing blockers',
      },
    ],
    risks: [
      {
        text: 'Third-party API integration may slip',
        severity: 'medium',
        context: 'Vendor response time uncertain',
      },
    ],
    actionItems: [
      {
        title: 'Follow up with vendor',
        description: 'Confirm API delivery date and escalation path',
        suggestedAssignee: null,
        suggestedDueDate: '2026-06-20',
      },
      {
        title: 'Update sprint board',
        description: 'Reflect agreed scope changes in the task board',
        suggestedAssignee: null,
        suggestedDueDate: null,
      },
    ],
  };
}

export function buildMockSummarizerOutput(userContent: string) {
  const analysis = buildMockMeetingAnalysis(userContent);
  return {
    summary: analysis.summary,
    keyTopics: analysis.topics,
  };
}

export function buildMockTaskExtractorOutput() {
  return {
    actionItems: buildMockMeetingAnalysis('').actionItems,
  };
}

export function buildMockDecisionOutput() {
  return {
    decisions: buildMockMeetingAnalysis('').decisions,
  };
}

export function buildMockRiskAnalyzerOutput() {
  return {
    risks: buildMockMeetingAnalysis('').risks,
  };
}

export function buildMockCompletionContent(request: LLMCompletionRequest): string {
  const userMessage = [...request.messages].reverse().find((m) => m.role === 'user')?.content ?? '';

  if (request.responseFormat === 'json_schema') {
    switch (request.workflow) {
      case 'summarizer':
        return JSON.stringify(buildMockSummarizerOutput(userMessage));
      case 'task-extractor':
        return JSON.stringify(buildMockTaskExtractorOutput());
      case 'decision':
        return JSON.stringify(buildMockDecisionOutput());
      case 'risk-analyzer':
        return JSON.stringify(buildMockRiskAnalyzerOutput());
      case 'knowledge-extract':
        return JSON.stringify({
          entries: [
            {
              entityType: 'agreement',
              title: 'Friday ship date',
              content: 'The team agreed to target Friday for the release.',
              confidence: 0.85,
            },
            {
              entityType: 'technical',
              title: 'Vendor API dependency',
              content: 'Delivery depends on third-party API availability from the vendor.',
              confidence: 0.8,
            },
          ],
        });
      case 'weekly-report':
        return JSON.stringify({
          title: 'Weekly Report (Mock)',
          sections: [
            {
              heading: 'Summary',
              content: 'The team held planning meetings and advanced key deliverables.',
            },
            {
              heading: 'Key decisions',
              content: 'Proceed with the proposed timeline after reviewing blockers.',
            },
            {
              heading: 'Open risks',
              content: 'Third-party API integration may slip due to vendor response time.',
            },
          ],
          taskStats: { created: 5, completed: 3, open: 2 },
          meetingCount: 2,
        });
      default:
        if (request.workflow === 'process-meeting' || userMessage.includes('Transcript:')) {
          return JSON.stringify(buildMockMeetingAnalysis(userMessage));
        }
        return JSON.stringify({ result: 'mock structured output' });
    }
  }

  if (request.workflow === 'chat') {
    return `Mock response based on your question. I don't have live retrieval in mock mode.`;
  }

  if (request.workflow === 'weekly-report') {
    return 'Weekly productivity remained steady with focused execution on sprint goals.';
  }

  return 'Mock LLM completion response.';
}

/** Deterministic pseudo-embedding from text hash (1536 dims, L2-normalized). */
export function buildMockEmbedding(text: string, dimensions = 1536): number[] {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  const vector = Array.from({ length: dimensions }, (_, i) => {
    const seed = Math.sin(hash + i * 0.713) * 10000;
    return seed - Math.floor(seed);
  });

  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / magnitude);
}
