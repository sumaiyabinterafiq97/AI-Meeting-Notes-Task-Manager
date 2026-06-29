import type { OrchestratorGraphState } from '../state/graph-state.types';

export type PartialGraphStateUpdate = Partial<Omit<OrchestratorGraphState, 'metrics'>> & {
  metrics?: Partial<OrchestratorGraphState['metrics']>;
};

export type GraphNodeFn<TState extends OrchestratorGraphState = OrchestratorGraphState> = (
  state: TState,
) => Promise<PartialGraphStateUpdate>;

export interface NodeFactory {
  createNode(nodeId: string): GraphNodeFn;
}
