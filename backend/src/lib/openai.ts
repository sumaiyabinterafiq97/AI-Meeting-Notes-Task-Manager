import OpenAI from 'openai';
import { env } from '../config/env';
import { buildAnalysisSystemPrompt, MEETING_ANALYSIS_SCHEMA } from '../modules/ai/ai.prompts';

export interface MeetingDecision {
  text: string;
  context: string;
}

export interface MeetingRisk {
  text: string;
  severity: 'low' | 'medium' | 'high';
  context: string;
}

export interface MeetingActionItem {
  title: string;
  description: string;
  suggestedAssignee: string | null;
  suggestedDueDate: string | null;
}

export interface MeetingAnalysisResult {
  summary: string;
  topics: string[];
  decisions: MeetingDecision[];
  risks: MeetingRisk[];
  actionItems: MeetingActionItem[];
}

export interface AnalysisResponse {
  result: MeetingAnalysisResult;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  rawResponse: unknown;
}

export interface AnalyzeTranscriptInput {
  transcript: string;
  meetingTitle: string;
  attendees: string[];
  memberNames: string[];
}

function buildMockAnalysis(input: AnalyzeTranscriptInput): MeetingAnalysisResult {
  const primaryAssignee = input.memberNames[0] ?? null;

  return {
    summary: `Mock analysis for "${input.meetingTitle}". The team reviewed priorities and agreed on next steps.`,
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
        suggestedAssignee: primaryAssignee,
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

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required when AI_USE_MOCK is disabled');
    }
    openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export async function analyzeTranscript(input: AnalyzeTranscriptInput): Promise<AnalysisResponse> {
  if (env.AI_USE_MOCK || !env.OPENAI_API_KEY) {
    const result = buildMockAnalysis(input);
    return {
      result,
      model: 'mock',
      promptTokens: null,
      completionTokens: null,
      rawResponse: result,
    };
  }

  const client = getOpenAIClient();
  const userContent = [
    `Meeting title: ${input.meetingTitle}`,
    `Attendees: ${input.attendees.join(', ') || 'Unknown'}`,
    '',
    'Transcript:',
    input.transcript,
  ].join('\n');

  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: [
      { role: 'system', content: buildAnalysisSystemPrompt(input.memberNames) },
      { role: 'user', content: userContent },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: MEETING_ANALYSIS_SCHEMA,
    },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned empty response');
  }

  const parsed = JSON.parse(content) as MeetingAnalysisResult;

  return {
    result: parsed,
    model: completion.model,
    promptTokens: completion.usage?.prompt_tokens ?? null,
    completionTokens: completion.usage?.completion_tokens ?? null,
    rawResponse: parsed,
  };
}
