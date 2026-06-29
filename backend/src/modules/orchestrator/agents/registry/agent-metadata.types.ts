import type { AgentType } from '../../../agents/types/agent.types';
import type { WorkflowId } from '../../state/graph-state.types';

export interface AgentCapability {
  id: string;
  description: string;
}

export interface AgentMetadata {
  id: AgentType;
  name: string;
  version: string;
  description: string;
  capabilities: AgentCapability[];
  dependencies: AgentType[];
  workflows: WorkflowId[];
  critical: boolean;
  retryable: boolean;
  maxRetries: number;
  timeoutMs: number;
  enabled: boolean;
}

export interface RegisteredAgent {
  metadata: AgentMetadata;
  registeredAt: string;
}
