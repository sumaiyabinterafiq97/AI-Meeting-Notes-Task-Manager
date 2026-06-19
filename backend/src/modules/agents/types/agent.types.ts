export type AgentType =
  | 'summarizer'
  | 'task-extractor'
  | 'decision'
  | 'risk-analyzer'
  | 'weekly-report'
  | 'knowledge'
  | 'chat'
  | 'retriever'
  | 'context-builder'
  | 'prompt-builder';

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface AgentError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface AgentMetrics {
  startedAt: string;
  completedAt?: string;
  latencyMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  model?: string;
  provider?: string;
}

export interface AgentMessage<TInput = unknown, TOutput = unknown> {
  id: string;
  correlationId: string;
  agentType: AgentType;
  workspaceId: string;
  meetingId?: string;
  jobId?: string;
  input: TInput;
  output?: TOutput;
  status: AgentStatus;
  error?: AgentError;
  metrics: AgentMetrics;
}

export interface IAgent<TInput, TOutput> {
  readonly type: AgentType;
  execute(message: AgentMessage<TInput, TOutput>): Promise<AgentMessage<TInput, TOutput>>;
}
