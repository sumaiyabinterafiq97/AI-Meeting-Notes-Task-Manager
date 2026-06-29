import type { WorkflowId } from '../state/graph-state.types';
import {
  latencyTrackerService,
  metricsService,
  METRIC_NAMES,
  retryObservabilityService,
} from '../../observability';

export interface OrchestratorLogEntry {
  level: 'info' | 'warn' | 'error';
  event: string;
  workflowId?: WorkflowId;
  correlationId: string;
  nodeId?: string;
  latencyMs?: number;
  status?: string;
  error?: string;
  timestamp: string;
}

type LogHandler = (entry: OrchestratorLogEntry) => void;

export class OrchestratorObservability {
  private handlers: LogHandler[] = [];

  onLog(handler: LogHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  private emit(entry: Omit<OrchestratorLogEntry, 'timestamp'>): void {
    const full: OrchestratorLogEntry = { ...entry, timestamp: new Date().toISOString() };
    for (const handler of this.handlers) {
      handler(full);
    }
    if (process.env.NODE_ENV !== 'test') {
      const payload = JSON.stringify(full);
      if (entry.level === 'error') {
        console.error(payload);
      } else if (entry.level === 'warn') {
        console.warn(payload);
      } else {
        console.info(payload);
      }
    }
  }

  logGraphStart(workflowId: WorkflowId, correlationId: string): void {
    this.emit({ level: 'info', event: 'graph.start', workflowId, correlationId });
  }

  logGraphComplete(
    workflowId: WorkflowId,
    correlationId: string,
    latencyMs: number,
    status?: string,
  ): void {
    latencyTrackerService.record(workflowId, latencyMs, { workflow: workflowId }, 'graph');
    metricsService.recordLatency(METRIC_NAMES.GRAPH_TIME, latencyMs, {
      workflow: workflowId,
      status,
    });
    this.emit({
      level: 'info',
      event: 'graph.complete',
      workflowId,
      correlationId,
      latencyMs,
      status,
    });
  }

  logNodeStart(workflowId: WorkflowId, nodeId: string, correlationId: string): void {
    this.emit({ level: 'info', event: 'node.start', workflowId, nodeId, correlationId });
  }

  logNodeComplete(
    workflowId: WorkflowId,
    nodeId: string,
    correlationId: string,
    latencyMs: number,
  ): void {
    latencyTrackerService.record(nodeId, latencyMs, { agent: nodeId, workflow: workflowId }, 'agent');
    metricsService.recordLatency(METRIC_NAMES.AGENT_TIME, latencyMs, {
      agent: nodeId,
      workflow: workflowId,
    });
    this.emit({
      level: 'info',
      event: 'node.complete',
      workflowId,
      nodeId,
      correlationId,
      latencyMs,
    });
  }

  logNodeFailure(
    workflowId: WorkflowId,
    nodeId: string,
    correlationId: string,
    error: unknown,
  ): void {
    this.emit({
      level: 'error',
      event: 'node.failure',
      workflowId,
      nodeId,
      correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  logRetry(workflowId: WorkflowId, nodeId: string, correlationId: string, attempt: number): void {
    retryObservabilityService.recordRetry({
      component: 'orchestrator',
      attempt,
      maxAttempts: 3,
      reason: `node ${nodeId} retry`,
    });
    this.emit({
      level: 'warn',
      event: 'node.retry',
      workflowId,
      nodeId,
      correlationId,
      status: String(attempt),
    });
  }

  logCheckpointRecovery(workflowId: WorkflowId, correlationId: string, checkpointId: string): void {
    this.emit({
      level: 'info',
      event: 'checkpoint.recovery',
      workflowId,
      correlationId,
      status: checkpointId,
    });
  }
}

export const orchestratorObservability = new OrchestratorObservability();
