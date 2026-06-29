import type { AgentError, AgentMessage, AgentType } from '../../agents/types/agent.types';
import type { MeetingPipelineInput, MeetingPipelineOutput } from '../../agents/orchestrator/types/pipeline.types';
import type { ExtractionAgentResults } from '../../agents/orchestrator/types/pipeline.types';

export type WorkflowId =
  | 'meeting-intelligence'
  | 'weekly-report'
  | 'chat'
  | 'knowledge-update';

export type PipelineStatus = 'pending' | 'running' | 'completed' | 'partial' | 'failed' | 'paused';

export interface TokenBudgetState {
  workspaceBudget: number;
  consumed: number;
  reserved: number;
  exceeded: boolean;
}

export interface NodeExecutionRecord {
  nodeId: string;
  agentType?: AgentType;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  latencyMs?: number;
  retries: number;
  error?: AgentError;
}

export interface ExecutionMetrics {
  startedAt: string;
  completedAt?: string;
  totalLatencyMs?: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  nodeExecutions: Record<string, NodeExecutionRecord>;
}

export interface AgentResultsMap {
  summarizer?: AgentMessage<unknown, unknown>;
  'task-extractor'?: AgentMessage<unknown, unknown>;
  decision?: AgentMessage<unknown, unknown>;
  'risk-analyzer'?: AgentMessage<unknown, unknown>;
  knowledge?: AgentMessage<unknown, unknown>;
  'weekly-report'?: AgentMessage<unknown, unknown>;
  chat?: AgentMessage<unknown, unknown>;
  retriever?: AgentMessage<unknown, unknown>;
  'context-builder'?: AgentMessage<unknown, unknown>;
}

export interface OrchestratorGraphState {
  workflowId: WorkflowId;
  correlationId: string;
  workspaceId: string;
  meetingId?: string;
  jobId?: string;
  userId?: string;
  sessionId?: string;
  status: PipelineStatus;
  input: Record<string, unknown>;
  agentResults: AgentResultsMap;
  merged?: ExtractionAgentResults;
  pipelineOutput?: MeetingPipelineOutput;
  errors: AgentError[];
  metrics: ExecutionMetrics;
  tokenBudget: TokenBudgetState;
  checkpointId?: string;
  humanApprovalRequired?: boolean;
  humanApproved?: boolean;
}

export interface MeetingIntelligenceState extends OrchestratorGraphState {
  workflowId: 'meeting-intelligence';
  input: MeetingPipelineInput & Record<string, unknown>;
}

export interface WeeklyReportState extends OrchestratorGraphState {
  workflowId: 'weekly-report';
}

export interface ChatPipelineState extends OrchestratorGraphState {
  workflowId: 'chat';
  sessionId: string;
}

export interface KnowledgeUpdateState extends OrchestratorGraphState {
  workflowId: 'knowledge-update';
}

export type AnyOrchestratorState =
  | MeetingIntelligenceState
  | WeeklyReportState
  | ChatPipelineState
  | KnowledgeUpdateState;
