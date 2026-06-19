import type {
  MeetingActionItem,
  MeetingAnalysisResult,
  MeetingDecision,
  MeetingRisk,
} from '../../../../lib/openai';

export interface MeetingPipelineInput {
  transcript: string;
  meetingTitle: string;
  meetingDate: string;
  attendees: string[];
  memberNames: string[];
  workspaceId: string;
  meetingId: string;
  jobId: string;
  correlationId: string;
}

export interface MeetingPipelineOutput {
  result: MeetingAnalysisResult;
  modelVersion: string;
  promptTokens: number;
  completionTokens: number;
  rawResponse: Record<string, unknown>;
  partialFailure: boolean;
}

export interface ExtractionAgentResults {
  summary: string;
  topics: string[];
  decisions: MeetingDecision[];
  risks: MeetingRisk[];
  actionItems: MeetingActionItem[];
  promptTokens: number;
  completionTokens: number;
  partialFailure: boolean;
  agentDetails: Record<string, { status: string; error?: string }>;
}
