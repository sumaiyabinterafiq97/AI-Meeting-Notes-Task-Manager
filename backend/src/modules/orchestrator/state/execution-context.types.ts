import type { WorkflowId } from './graph-state.types';

export interface ExecutionContext {
  correlationId: string;
  workspaceId: string;
  workflowId: WorkflowId;
  meetingId?: string;
  jobId?: string;
  userId?: string;
  sessionId?: string;
  startedAt: string;
  traceTags: Record<string, string>;
}

export interface NodeExecutionContext extends ExecutionContext {
  nodeId: string;
  attempt: number;
  maxRetries: number;
  timeoutMs: number;
  signal?: AbortSignal;
}

export function createExecutionContext(params: {
  correlationId: string;
  workspaceId: string;
  workflowId: WorkflowId;
  meetingId?: string;
  jobId?: string;
  userId?: string;
  sessionId?: string;
}): ExecutionContext {
  return {
    ...params,
    startedAt: new Date().toISOString(),
    traceTags: {
      correlationId: params.correlationId,
      workspaceId: params.workspaceId,
      workflowId: params.workflowId,
      ...(params.meetingId ? { meetingId: params.meetingId } : {}),
      ...(params.jobId ? { jobId: params.jobId } : {}),
    },
  };
}
