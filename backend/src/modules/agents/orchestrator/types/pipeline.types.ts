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
  durationMinutes?: number | null;
  tags?: string[];
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

export interface AgentDetailEntry {
  status: string;
  error?: string;
  nextSteps?: string[];
  participantsDiscussed?: string[];
  confidenceScore?: number;
  citationCount?: number;
  itemCount?: number;
  filteredCount?: number;
  averageConfidence?: number;
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
  agentDetails: Record<string, AgentDetailEntry>;
}
