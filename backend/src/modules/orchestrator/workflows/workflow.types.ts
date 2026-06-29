import type { WorkflowId } from '../state/graph-state.types';

export interface WorkflowEdge {
  from: string;
  to: string;
}

export interface WorkflowConditionalEdge<TState = unknown> {
  from: string;
  route: (state: TState) => string;
  mapping: Record<string, string>;
}

export interface WorkflowNodeDefinition {
  id: string;
  agentType?: string;
  parallel?: boolean;
  optional?: boolean;
  critical?: boolean;
}

export interface WorkflowDefinition {
  id: WorkflowId;
  version: string;
  description: string;
  nodes: WorkflowNodeDefinition[];
  edges: WorkflowEdge[];
  conditionalEdges?: WorkflowConditionalEdge[];
  timeoutMs: number;
  supportsCheckpoint: boolean;
  supportsHumanInLoop: boolean;
}

export const WORKFLOW_REGISTRY: Record<WorkflowId, WorkflowDefinition> = {
  'meeting-intelligence': {
    id: 'meeting-intelligence',
    version: '1.0.0',
    description: 'Parallel extraction → merge → persist → knowledge',
    nodes: [
      { id: 'summarizer', agentType: 'summarizer', parallel: true, critical: true },
      { id: 'task_extractor', agentType: 'task-extractor', parallel: true },
      { id: 'decision', agentType: 'decision', parallel: true },
      { id: 'risk', agentType: 'risk-analyzer' },
      { id: 'merge', agentType: undefined },
      { id: 'persist', agentType: undefined },
      { id: 'knowledge', agentType: 'knowledge', optional: true },
    ],
    edges: [
      { from: '__start__', to: 'summarizer' },
      { from: '__start__', to: 'task_extractor' },
      { from: '__start__', to: 'decision' },
      { from: 'summarizer', to: 'risk' },
      { from: 'task_extractor', to: 'risk' },
      { from: 'decision', to: 'risk' },
      { from: 'risk', to: 'merge' },
      { from: 'merge', to: 'persist' },
      { from: 'persist', to: 'knowledge' },
      { from: 'knowledge', to: '__end__' },
    ],
    timeoutMs: 300_000,
    supportsCheckpoint: true,
    supportsHumanInLoop: false,
  },
  'weekly-report': {
    id: 'weekly-report',
    version: '1.0.0',
    description: 'Aggregate data → retrieve → report → persist',
    nodes: [
      { id: 'retriever', agentType: 'retriever' },
      { id: 'context_builder', agentType: 'context-builder' },
      { id: 'report', agentType: 'weekly-report', critical: true },
      { id: 'persist', agentType: undefined },
    ],
    edges: [
      { from: '__start__', to: 'retriever' },
      { from: 'retriever', to: 'context_builder' },
      { from: 'context_builder', to: 'report' },
      { from: 'report', to: 'persist' },
      { from: 'persist', to: '__end__' },
    ],
    timeoutMs: 180_000,
    supportsCheckpoint: true,
    supportsHumanInLoop: false,
  },
  chat: {
    id: 'chat',
    version: '1.0.0',
    description: 'Retrieve → context → chat → citations',
    nodes: [
      { id: 'retriever', agentType: 'retriever' },
      { id: 'context_builder', agentType: 'context-builder' },
      { id: 'chat', agentType: 'chat', critical: true },
    ],
    edges: [
      { from: '__start__', to: 'retriever' },
      { from: 'retriever', to: 'context_builder' },
      { from: 'context_builder', to: 'chat' },
      { from: 'chat', to: '__end__' },
    ],
    timeoutMs: 120_000,
    supportsCheckpoint: false,
    supportsHumanInLoop: false,
  },
  'knowledge-update': {
    id: 'knowledge-update',
    version: '1.0.0',
    description: 'Chunk → embed → vector store → knowledge agent',
    nodes: [
      { id: 'chunking', agentType: undefined },
      { id: 'embedding', agentType: undefined },
      { id: 'vector_storage', agentType: undefined },
      { id: 'knowledge', agentType: 'knowledge' },
      { id: 'index_update', agentType: undefined },
    ],
    edges: [
      { from: '__start__', to: 'chunking' },
      { from: 'chunking', to: 'embedding' },
      { from: 'embedding', to: 'vector_storage' },
      { from: 'vector_storage', to: 'knowledge' },
      { from: 'knowledge', to: 'index_update' },
      { from: 'index_update', to: '__end__' },
    ],
    timeoutMs: 300_000,
    supportsCheckpoint: true,
    supportsHumanInLoop: false,
  },
};

export function getWorkflowDefinition(workflowId: WorkflowId): WorkflowDefinition {
  const definition = WORKFLOW_REGISTRY[workflowId];
  if (!definition) {
    throw new Error(`Unknown workflow: ${workflowId}`);
  }
  return definition;
}
