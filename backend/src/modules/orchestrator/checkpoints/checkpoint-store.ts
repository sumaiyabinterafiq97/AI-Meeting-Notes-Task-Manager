import type { OrchestratorGraphState } from '../state/graph-state.types';
import { sanitizeStateForCheckpoint } from '../middleware/workspace-isolation.middleware';

export interface CheckpointRecord {
  id: string;
  threadId: string;
  state: OrchestratorGraphState;
  createdAt: string;
}

export interface CheckpointStore {
  save(threadId: string, state: OrchestratorGraphState): Promise<CheckpointRecord>;
  load(threadId: string): Promise<CheckpointRecord | null>;
  list(threadId: string): Promise<CheckpointRecord[]>;
  delete(threadId: string): Promise<void>;
}

export class InMemoryCheckpointStore implements CheckpointStore {
  private store = new Map<string, CheckpointRecord[]>();

  async save(threadId: string, state: OrchestratorGraphState): Promise<CheckpointRecord> {
    const record: CheckpointRecord = {
      id: `${threadId}-${Date.now()}`,
      threadId,
      state: sanitizeStateForCheckpoint(state),
      createdAt: new Date().toISOString(),
    };
    const existing = this.store.get(threadId) ?? [];
    existing.push(record);
    this.store.set(threadId, existing);
    return record;
  }

  async load(threadId: string): Promise<CheckpointRecord | null> {
    const records = this.store.get(threadId);
    return records?.[records.length - 1] ?? null;
  }

  async list(threadId: string): Promise<CheckpointRecord[]> {
    return this.store.get(threadId) ?? [];
  }

  async delete(threadId: string): Promise<void> {
    this.store.delete(threadId);
  }
}

export const inMemoryCheckpointStore = new InMemoryCheckpointStore();

export class CheckpointService {
  constructor(private readonly store: CheckpointStore = inMemoryCheckpointStore) {}

  async checkpoint(threadId: string, state: OrchestratorGraphState): Promise<CheckpointRecord> {
    return this.store.save(threadId, state);
  }

  async recover(threadId: string): Promise<OrchestratorGraphState | null> {
    const record = await this.store.load(threadId);
    return record?.state ?? null;
  }
}

export const checkpointService = new CheckpointService();
