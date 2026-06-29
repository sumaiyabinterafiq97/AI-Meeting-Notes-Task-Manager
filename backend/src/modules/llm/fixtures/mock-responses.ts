import type { LLMCompletionRequest, LLMCompletionResponse } from '../types/llm.types';

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
    nextSteps: ['Schedule follow-up to confirm vendor timeline'],
    participantsDiscussed: ['Alex', 'Jordan'],
  };
}

export function buildMockTaskExtractorOutput() {
  return {
    actionItems: buildMockMeetingAnalysis('').actionItems.map((item) => ({
      ...item,
      priority: 'medium' as const,
      dependencies: [] as string[],
      confidenceScore: 0.88,
    })),
  };
}

export function buildMockDecisionOutput() {
  return {
    decisions: buildMockMeetingAnalysis('').decisions.map((decision) => ({
      ...decision,
      stakeholders: ['Alex', 'Jordan'],
      confidenceScore: 0.92,
      supportingEvidence: 'we agreed to proceed with the proposed timeline',
    })),
  };
}

export function buildMockRiskAnalyzerOutput() {
  return {
    risks: buildMockMeetingAnalysis('').risks.map((risk) => ({
      ...risk,
      severity: risk.severity as 'medium',
      impact: 'Launch timeline may slip if vendor delays persist',
      likelihood: 'medium' as const,
      recommendation: 'Escalate with vendor account manager',
      evidence: 'Vendor response time uncertain',
      confidenceScore: 0.82,
    })),
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
      case 'chat':
        return JSON.stringify({
          content:
            'The team selected OAuth 2.0 with PKCE for authentication [CITATION-1].',
          citations: [
            {
              index: 1,
              chunkId: '00000000-0000-0000-0000-000000000011',
              meetingId: '00000000-0000-0000-0000-000000000001',
              excerpt: 'OAuth 2.0 with PKCE was selected.',
              claimText: 'The team selected OAuth 2.0 with PKCE for authentication',
            },
          ],
          grounded: true,
          refusalReason: null,
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
              heading: 'Achievements',
              content: 'Proceed with the proposed timeline after reviewing blockers [CITATION-1].',
              citations: [{ index: 1 }],
            },
            {
              heading: 'Pending Work',
              content: 'Two open tasks remain on the sprint board.',
            },
            {
              heading: 'Risks',
              content: 'Third-party API integration may slip due to vendor response time.',
            },
            {
              heading: 'Recommendations',
              content: 'Escalate vendor follow-up and confirm API delivery dates.',
            },
            {
              heading: 'Metrics',
              content: 'Meetings: 2 | Tasks created: 5 | Tasks completed: 3',
            },
          ],
          taskStats: { created: 5, completed: 3, open: 2, overdue: 0 },
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

function extractToolQuery(userMessage: string): string | null {
  const normalized = userMessage.toLowerCase();
  if (/\btasks?\b/.test(normalized)) return 'pending tasks';
  if (/\bdecisions?\b/.test(normalized)) return 'recent decisions';
  if (/\brisks?\b/.test(normalized)) return 'open risks';
  if (/\bmeetings?\b/.test(normalized)) return 'recent meetings';
  if (/\bknowledge\b|\bsearch\b/.test(normalized)) return userMessage.slice(0, 120);
  return null;
}

function resolveMockToolName(userMessage: string): string {
  const normalized = userMessage.toLowerCase();
  if (/\btasks?\b/.test(normalized)) return 'SearchTasksTool';
  if (/\bdecisions?\b/.test(normalized)) return 'SearchDecisionsTool';
  if (/\brisks?\b/.test(normalized)) return 'SearchRisksTool';
  if (/\bmeetings?\b/.test(normalized)) return 'SearchMeetingsTool';
  return 'SearchKnowledgeTool';
}

export function buildMockChatToolResponse(
  request: LLMCompletionRequest,
): Pick<LLMCompletionResponse, 'content' | 'toolCalls' | 'finishReason'> {
  const hasToolResult = request.messages.some((message) => message.role === 'tool');
  const userMessage = [...request.messages].reverse().find((message) => message.role === 'user')?.content ?? '';
  const toolQuery = extractToolQuery(userMessage);

  if (hasToolResult) {
    return {
      content:
        'Based on workspace data, I found relevant matches for your question. Please review the cited sources in context [CITATION-1].',
      finishReason: 'stop',
    };
  }

  if (request.tools?.length && toolQuery) {
    return {
      content: '',
      toolCalls: [
        {
          id: 'call_mock_tool_1',
          name: resolveMockToolName(userMessage),
          arguments: JSON.stringify({ query: toolQuery, limit: 5 }),
        },
      ],
      finishReason: 'tool_calls',
    };
  }

  return {
    content: buildMockCompletionContent(request),
    finishReason: 'stop',
  };
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
