import type { OrchestratorGraphState } from '../state/graph-state.types';

export class WorkspaceIsolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceIsolationError';
  }
}

export function assertWorkspaceIsolation(
  state: OrchestratorGraphState,
  expectedWorkspaceId: string,
): void {
  if (state.workspaceId !== expectedWorkspaceId) {
    throw new WorkspaceIsolationError(
      `Workspace mismatch: state=${state.workspaceId}, expected=${expectedWorkspaceId}`,
    );
  }
}

export function sanitizeStateForCheckpoint(state: OrchestratorGraphState): OrchestratorGraphState {
  const { input, ...rest } = state;
  const sanitizedInput = { ...input };
  if (typeof sanitizedInput.transcript === 'string') {
    sanitizedInput.transcript = `[redacted:${sanitizedInput.transcript.length} chars]`;
  }
  if (typeof sanitizedInput.userMessage === 'string') {
    sanitizedInput.userMessage = `[redacted:${sanitizedInput.userMessage.length} chars]`;
  }
  return { ...rest, input: sanitizedInput };
}

export function validateWorkspaceScope(
  state: OrchestratorGraphState,
  resourceWorkspaceId: string,
): void {
  assertWorkspaceIsolation(state, resourceWorkspaceId);
}
