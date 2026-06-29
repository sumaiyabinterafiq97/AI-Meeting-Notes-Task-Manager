import { graphExecutorService } from '../executors/graph-executor.service';
import { getWorkflowDefinition } from '../workflows/workflow.types';
import { knowledgeUpdateNodes } from '../nodes';
import { createInitialState } from '../state/reducers';
import type { KnowledgeUpdateState } from '../state/graph-state.types';

export async function runKnowledgeUpdateGraph(
  input: {
    correlationId: string;
    workspaceId: string;
    meetingId: string;
    jobId?: string;
    transcript?: string;
    summary?: string;
    decisions?: Array<{ text: string; context: string }>;
    meetingTitle?: string;
    meetingDate?: string;
  },
  options?: { threadId?: string },
): Promise<KnowledgeUpdateState> {
  const definition = getWorkflowDefinition('knowledge-update');
  const initialState: KnowledgeUpdateState = {
    ...createInitialState({
      workflowId: 'knowledge-update',
      correlationId: input.correlationId,
      workspaceId: input.workspaceId,
      meetingId: input.meetingId,
      jobId: input.jobId,
      input,
    }),
    workflowId: 'knowledge-update',
  };

  return graphExecutorService.invoke(definition, knowledgeUpdateNodes, initialState, {
    threadId: options?.threadId ?? input.correlationId,
  }) as Promise<KnowledgeUpdateState>;
}
