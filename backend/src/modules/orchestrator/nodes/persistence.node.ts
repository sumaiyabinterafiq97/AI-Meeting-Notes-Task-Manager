import type { MeetingIntelligenceState } from '../state/graph-state.types';
import type { GraphNodeFn } from './node.types';

/**
 * Persistence is handled by the job layer after graph completion.
 * This node marks outputs ready for downstream persistence.
 */
export const persistenceNode: GraphNodeFn<MeetingIntelligenceState> = async (state) => {
  if (state.status === 'failed' || !state.pipelineOutput) {
    return { status: 'failed' };
  }
  return {
    status: state.pipelineOutput.partialFailure ? 'partial' : 'running',
  };
};
