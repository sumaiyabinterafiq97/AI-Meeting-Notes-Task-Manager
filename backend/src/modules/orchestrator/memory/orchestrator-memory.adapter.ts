import { conversationMemoryService } from '../../agents/memory/conversation-memory.service';
import { sessionMemoryStore } from '../../agents/memory/session-memory.store';
import type { OrchestratorGraphState } from '../state/graph-state.types';

export class ExecutionMemoryStore {
  private executions = new Map<string, OrchestratorGraphState>();

  set(correlationId: string, state: OrchestratorGraphState): void {
    this.executions.set(correlationId, state);
  }

  get(correlationId: string): OrchestratorGraphState | undefined {
    return this.executions.get(correlationId);
  }

  delete(correlationId: string): void {
    this.executions.delete(correlationId);
  }
}

export const executionMemoryStore = new ExecutionMemoryStore();

export class OrchestratorMemoryAdapter {
  prepareContext(input: Parameters<typeof conversationMemoryService.prepareContext>[0]) {
    return conversationMemoryService.prepareContext(input);
  }

  recordTurn(input: Parameters<typeof conversationMemoryService.recordTurn>[0]) {
    return conversationMemoryService.recordTurn(input);
  }

  getSessionMemory(workspaceId: string, sessionId: string) {
    return sessionMemoryStore.get(workspaceId, sessionId);
  }

  setSessionMemory(
    workspaceId: string,
    sessionId: string,
    state: Parameters<typeof sessionMemoryStore.set>[2],
  ) {
    return sessionMemoryStore.set(workspaceId, sessionId, state);
  }
}

export const orchestratorMemoryAdapter = new OrchestratorMemoryAdapter();
