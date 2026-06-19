import { llmService } from '../modules/llm';
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
  workspaceId?: string;
  correlationId?: string;
}

/**
 * @deprecated Use llmService.complete() directly. Kept for backward compatibility.
 */
export async function analyzeTranscript(input: AnalyzeTranscriptInput): Promise<AnalysisResponse> {
  const userContent = [
    `Meeting title: ${input.meetingTitle}`,
    `Attendees: ${input.attendees.join(', ') || 'Unknown'}`,
    '',
    'Transcript:',
    input.transcript,
  ].join('\n');

  const response = await llmService.complete(
    {
      workflow: 'process-meeting',
      messages: [
        { role: 'system', content: buildAnalysisSystemPrompt(input.memberNames) },
        { role: 'user', content: userContent },
      ],
      responseFormat: 'json_schema',
      jsonSchema: MEETING_ANALYSIS_SCHEMA as unknown as Record<string, unknown>,
      workspaceId: input.workspaceId,
      correlationId: input.correlationId,
    },
    {
      promptId: 'meeting-analysis',
      promptVersion: '1.0.0',
    },
  );

  const parsed = JSON.parse(response.content) as MeetingAnalysisResult;

  return {
    result: parsed,
    model: response.model,
    promptTokens: response.promptTokens,
    completionTokens: response.completionTokens,
    rawResponse: parsed,
  };
}
