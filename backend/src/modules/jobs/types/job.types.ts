export type JobQueueName =
  | 'meeting-ai-processing'
  | 'embed-meeting'
  | 'weekly-report'
  | 'reindex-workspace'
  | 'transcribe-audio'
  | 'calendar-sync';

export type JobPriority = 'high' | 'normal' | 'low';

export interface JobPayload {
  correlationId?: string;
  workspaceId?: string;
  meetingId?: string;
  [key: string]: unknown;
}

export interface JobDefinition {
  name: string;
  queue: JobQueueName;
  priority?: JobPriority;
  maxAttempts?: number;
}
