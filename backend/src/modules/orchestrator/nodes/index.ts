import type { GraphNodeFn } from './node.types';
import type { MeetingIntelligenceState } from '../state/graph-state.types';
import { summarizerNode } from './summarizer.node';
import { taskExtractorNode } from './task-extractor.node';
import { decisionNode } from './decision.node';
import { riskNode } from './risk.node';
import { mergeNode } from './merge.node';
import { persistenceNode } from './persistence.node';
import { knowledgeNode } from './knowledge.node';
import { retrieverNode } from './retriever.node';
import { contextBuilderNode } from './context-builder.node';
import { chatNode } from './chat.node';
import { reportNode, weeklyReportPersistNode } from './report.node';
import {
  chunkingNode,
  embeddingNode,
  vectorStorageNode,
  indexUpdateNode,
  knowledgeUpdateKnowledgeNode,
} from './knowledge-update.nodes';

export const meetingIntelligenceNodes: Record<string, GraphNodeFn<MeetingIntelligenceState>> = {
  summarizer: summarizerNode,
  task_extractor: taskExtractorNode,
  decision: decisionNode,
  risk: riskNode,
  merge: mergeNode,
  persist: persistenceNode,
  knowledge: knowledgeNode,
};

export const weeklyReportNodes: Record<string, GraphNodeFn> = {
  retriever: retrieverNode,
  context_builder: contextBuilderNode,
  report: reportNode,
  persist: weeklyReportPersistNode,
};

export const chatPipelineNodes: Record<string, GraphNodeFn> = {
  retriever: retrieverNode,
  context_builder: contextBuilderNode,
  chat: chatNode,
};

export const knowledgeUpdateNodes: Record<string, GraphNodeFn> = {
  chunking: chunkingNode,
  embedding: embeddingNode,
  vector_storage: vectorStorageNode,
  knowledge: knowledgeUpdateKnowledgeNode,
  index_update: indexUpdateNode,
};

export * from './summarizer.node';
export * from './task-extractor.node';
export * from './decision.node';
export * from './risk.node';
export * from './knowledge.node';
export * from './chat.node';
export * from './report.node';
export * from './retriever.node';
export * from './context-builder.node';
export * from './persistence.node';
export * from './merge.node';
export * from './knowledge-update.nodes';
export * from './node.types';
