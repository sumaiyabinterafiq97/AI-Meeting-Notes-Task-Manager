import type {
  AgentResultsMap,
  ExecutionMetrics,
  NodeExecutionRecord,
  OrchestratorGraphState,
  TokenBudgetState,
} from './graph-state.types';
import type { AgentError } from '../../agents/types/agent.types';

export function mergePipelineStatus(
  left: OrchestratorGraphState['status'],
  right: OrchestratorGraphState['status'],
): OrchestratorGraphState['status'] {
  const priority: Record<OrchestratorGraphState['status'], number> = {
    failed: 5,
    partial: 4,
    running: 3,
    completed: 2,
    paused: 1,
    pending: 0,
  };
  return priority[right] >= priority[left] ? right : left;
}

export function createInitialMetrics(): ExecutionMetrics {
  return {
    startedAt: new Date().toISOString(),
    promptTokens: 0,
    completionTokens: 0,
    estimatedCostUsd: 0,
    nodeExecutions: {},
  };
}

export function createInitialTokenBudget(workspaceBudget = 500_000): TokenBudgetState {
  return {
    workspaceBudget,
    consumed: 0,
    reserved: 0,
    exceeded: false,
  };
}

export function mergeAgentResults(
  left: AgentResultsMap,
  right: AgentResultsMap,
): AgentResultsMap {
  return { ...left, ...right };
}

export function mergeErrors(left: AgentError[], right: AgentError[]): AgentError[] {
  return [...left, ...right];
}

export function mergeMetrics(left: ExecutionMetrics, right: Partial<ExecutionMetrics>): ExecutionMetrics {
  const nodeExecutions = { ...left.nodeExecutions, ...right.nodeExecutions };
  return {
    startedAt: left.startedAt,
    completedAt: right.completedAt ?? left.completedAt,
    totalLatencyMs: right.totalLatencyMs ?? left.totalLatencyMs,
    promptTokens: left.promptTokens + (right.promptTokens ?? 0),
    completionTokens: left.completionTokens + (right.completionTokens ?? 0),
    estimatedCostUsd: left.estimatedCostUsd + (right.estimatedCostUsd ?? 0),
    nodeExecutions,
  };
}

export function mergeTokenBudget(left: TokenBudgetState, right: Partial<TokenBudgetState>): TokenBudgetState {
  const consumed = left.consumed + (right.consumed ?? 0);
  const workspaceBudget = right.workspaceBudget ?? left.workspaceBudget;
  return {
    workspaceBudget,
    consumed,
    reserved: right.reserved ?? left.reserved,
    exceeded: consumed >= workspaceBudget,
  };
}

export function recordNodeExecution(
  metrics: ExecutionMetrics,
  record: NodeExecutionRecord,
): ExecutionMetrics {
  return {
    ...metrics,
    nodeExecutions: {
      ...metrics.nodeExecutions,
      [record.nodeId]: record,
    },
  };
}

export function createInitialState(
  partial: Pick<
    OrchestratorGraphState,
    'workflowId' | 'correlationId' | 'workspaceId' | 'input'
  > &
    Partial<
      Pick<
        OrchestratorGraphState,
        'meetingId' | 'jobId' | 'userId' | 'sessionId' | 'tokenBudget'
      >
    >,
): OrchestratorGraphState {
  return {
    ...partial,
    status: 'pending',
    agentResults: {},
    errors: [],
    metrics: createInitialMetrics(),
    tokenBudget: partial.tokenBudget ?? createInitialTokenBudget(),
  };
}
