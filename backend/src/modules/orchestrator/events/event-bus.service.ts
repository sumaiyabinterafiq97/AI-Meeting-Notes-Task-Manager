import type { WorkflowId } from '../state/graph-state.types';

export type OrchestratorEventType =
  | 'MeetingProcessed'
  | 'TaskCreated'
  | 'DecisionDetected'
  | 'RiskDetected'
  | 'KnowledgeUpdated'
  | 'WeeklyReportGenerated'
  | 'ChatCompleted'
  | 'GraphFailed'
  | 'GraphPartialSuccess';

export interface OrchestratorEvent<TPayload = Record<string, unknown>> {
  type: OrchestratorEventType;
  workflowId: WorkflowId;
  correlationId: string;
  workspaceId: string;
  meetingId?: string;
  sessionId?: string;
  payload: TPayload;
  timestamp: string;
}

export type EventHandler = (event: OrchestratorEvent) => void | Promise<void>;

export class EventBusService {
  private handlers = new Map<OrchestratorEventType | '*', Set<EventHandler>>();

  subscribe(type: OrchestratorEventType | '*', handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  async emit(event: OrchestratorEvent): Promise<void> {
    const typeHandlers = this.handlers.get(event.type) ?? new Set();
    const wildcardHandlers = this.handlers.get('*') ?? new Set();
    const all = [...typeHandlers, ...wildcardHandlers];
    await Promise.all(all.map((handler) => handler(event)));
  }

  createEvent<TPayload>(
    type: OrchestratorEventType,
    params: Omit<OrchestratorEvent<TPayload>, 'type' | 'timestamp'>,
  ): OrchestratorEvent<TPayload> {
    return {
      type,
      ...params,
      timestamp: new Date().toISOString(),
    };
  }
}

export const orchestratorEventBus = new EventBusService();
