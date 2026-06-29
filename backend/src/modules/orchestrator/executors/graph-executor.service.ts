import { Annotation, StateGraph, END, START } from '@langchain/langgraph';
import type { OrchestratorGraphState } from '../state/graph-state.types';
import {
  mergeAgentResults,
  mergeErrors,
  mergeMetrics,
  mergePipelineStatus,
  mergeTokenBudget,
} from '../state/reducers';
import type { WorkflowDefinition } from '../workflows/workflow.types';
import type { GraphNodeFn } from '../nodes/node.types';
import { orchestratorObservability } from '../middleware/observability.middleware';

export const OrchestratorStateAnnotation = Annotation.Root({
  workflowId: Annotation<OrchestratorGraphState['workflowId']>,
  correlationId: Annotation<string>,
  workspaceId: Annotation<string>,
  meetingId: Annotation<string | undefined>,
  jobId: Annotation<string | undefined>,
  userId: Annotation<string | undefined>,
  sessionId: Annotation<string | undefined>,
  status: Annotation<OrchestratorGraphState['status']>({
    reducer: mergePipelineStatus,
    default: () => 'pending',
  }),
  input: Annotation<Record<string, unknown>>,
  agentResults: Annotation<OrchestratorGraphState['agentResults']>({
    reducer: mergeAgentResults,
    default: () => ({}),
  }),
  merged: Annotation<OrchestratorGraphState['merged']>,
  pipelineOutput: Annotation<OrchestratorGraphState['pipelineOutput']>,
  errors: Annotation<OrchestratorGraphState['errors']>({
    reducer: mergeErrors,
    default: () => [],
  }),
  metrics: Annotation<OrchestratorGraphState['metrics']>({
    reducer: mergeMetrics,
    default: () => ({
      startedAt: new Date().toISOString(),
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: 0,
      nodeExecutions: {},
    }),
  }),
  tokenBudget: Annotation<OrchestratorGraphState['tokenBudget']>({
    reducer: mergeTokenBudget,
    default: () => ({
      workspaceBudget: 500_000,
      consumed: 0,
      reserved: 0,
      exceeded: false,
    }),
  }),
  checkpointId: Annotation<string | undefined>,
  humanApprovalRequired: Annotation<boolean | undefined>,
  humanApproved: Annotation<boolean | undefined>,
});

export type AnnotatedOrchestratorState = typeof OrchestratorStateAnnotation.State;

export class GraphExecutorService {
  buildGraph<TState extends OrchestratorGraphState>(
    definition: WorkflowDefinition,
    nodeHandlers: Record<string, GraphNodeFn<TState>>,
  ) {
    const graph = new StateGraph(OrchestratorStateAnnotation);

    for (const node of definition.nodes) {
      const handler = nodeHandlers[node.id];
      if (!handler) {
        throw new Error(`Missing node handler for ${node.id}`);
      }
      graph.addNode(node.id, async (state: AnnotatedOrchestratorState) => {
        const startedAt = Date.now();
        orchestratorObservability.logNodeStart(definition.id, node.id, state.correlationId);
        try {
          const update = await handler(state as TState);
          orchestratorObservability.logNodeComplete(
            definition.id,
            node.id,
            state.correlationId,
            Date.now() - startedAt,
          );
          return update;
        } catch (error) {
          orchestratorObservability.logNodeFailure(
            definition.id,
            node.id,
            state.correlationId,
            error,
          );
          throw error;
        }
      });
    }

    for (const edge of definition.edges) {
      if (edge.from === '__start__') {
        // LangGraph node IDs are dynamic strings from workflow definitions
        graph.addEdge(START, edge.to as '__start__');
      } else if (edge.to === '__end__') {
        graph.addEdge(edge.from as '__start__', END);
      } else {
        graph.addEdge(edge.from as '__start__', edge.to as '__start__');
      }
    }

    if (definition.conditionalEdges) {
      for (const conditional of definition.conditionalEdges) {
        graph.addConditionalEdges(
          conditional.from as '__start__',
          (state: AnnotatedOrchestratorState) => conditional.route(state as TState),
          conditional.mapping as Record<string, '__start__'>,
        );
      }
    }

    return graph;
  }

  compile<TState extends OrchestratorGraphState>(
    definition: WorkflowDefinition,
    nodeHandlers: Record<string, GraphNodeFn<TState>>,
  ) {
    const graph = this.buildGraph(definition, nodeHandlers);
    return graph.compile();
  }

  async invoke<TState extends OrchestratorGraphState>(
    definition: WorkflowDefinition,
    nodeHandlers: Record<string, GraphNodeFn<TState>>,
    initialState: TState,
    options?: { threadId?: string },
  ): Promise<TState> {
    const startedAt = Date.now();
    orchestratorObservability.logGraphStart(definition.id, initialState.correlationId);

    const compiled = this.compile(definition, nodeHandlers);

    const config = options?.threadId
      ? { configurable: { thread_id: options.threadId } }
      : undefined;

    const result = (await compiled.invoke(initialState, config)) as TState;

    orchestratorObservability.logGraphComplete(
      definition.id,
      initialState.correlationId,
      Date.now() - startedAt,
      result.status,
    );

    return result;
  }
}

export const graphExecutorService = new GraphExecutorService();
