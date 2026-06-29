import type { AgentType } from '../../agents/types/agent.types';
import { agentRegistry } from '../agents/registry/agent-registry';
import { nodeCircuitBreaker } from './circuit-breaker.executor';
import { withRetry, DEFAULT_RETRY_POLICY } from './retry.executor';
import { withTimeout } from './timeout.executor';
import { recordNodeExecution } from '../state/reducers';
import type { PartialGraphStateUpdate } from '../nodes/node.types';
import type { OrchestratorGraphState } from '../state/graph-state.types';

export interface ExecuteNodeParams<TState extends OrchestratorGraphState> {
  nodeId: string;
  agentType?: AgentType;
  state: TState;
  fn: () => Promise<PartialGraphStateUpdate>;
  timeoutMs?: number;
  maxRetries?: number;
}

export async function executeNode<TState extends OrchestratorGraphState>(
  params: ExecuteNodeParams<TState>,
): Promise<PartialGraphStateUpdate> {
  const metadata = params.agentType ? agentRegistry.getMetadata(params.agentType) : undefined;

  const timeoutMs = params.timeoutMs ?? metadata?.timeoutMs ?? 120_000;
  const maxRetries = params.maxRetries ?? metadata?.maxRetries ?? DEFAULT_RETRY_POLICY.maxRetries;
  const startedAt = Date.now();
  const circuitKey = `${params.state.workspaceId}:${params.nodeId}`;

  let retries = 0;

  const run = async (): Promise<PartialGraphStateUpdate> => {
    return nodeCircuitBreaker.execute(circuitKey, () =>
      withTimeout(async () => params.fn(), timeoutMs, params.nodeId),
    );
  };

  try {
    const result = await withRetry(
      async (attempt) => {
        retries = attempt;
        return run();
      },
      { ...DEFAULT_RETRY_POLICY, maxRetries },
      () => undefined,
    );

    const latencyMs = Date.now() - startedAt;
    const nodeRecord = {
      nodeId: params.nodeId,
      agentType: metadata?.id,
      status: 'completed' as const,
      startedAt: new Date(startedAt).toISOString(),
      completedAt: new Date().toISOString(),
      latencyMs,
      retries,
    };

    return {
      ...result,
      metrics: recordNodeExecution(params.state.metrics, nodeRecord),
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : 'Node execution failed';
    const nodeRecord = {
      nodeId: params.nodeId,
      agentType: metadata?.id,
      status: 'failed' as const,
      startedAt: new Date(startedAt).toISOString(),
      completedAt: new Date().toISOString(),
      latencyMs,
      retries,
      error: {
        code: 'NODE_EXECUTION_FAILED',
        message,
        retryable: retries < maxRetries,
      },
    };

    return {
      errors: [
        {
          code: 'NODE_EXECUTION_FAILED',
          message: `${params.nodeId}: ${message}`,
          retryable: metadata?.retryable ?? true,
        },
      ],
      metrics: recordNodeExecution(params.state.metrics, nodeRecord),
    };
  }
}
