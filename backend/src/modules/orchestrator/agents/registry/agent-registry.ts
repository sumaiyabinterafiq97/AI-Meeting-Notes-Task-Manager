import type { AgentMetadata, RegisteredAgent } from './agent-metadata.types';
import type { AgentType } from '../../../agents/types/agent.types';

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_RETRIES = 2;

const BUILTIN_AGENTS: AgentMetadata[] = [
  {
    id: 'summarizer',
    name: 'Summarizer Agent',
    version: '2.1.0',
    description: 'Generates structured meeting summary from transcript',
    capabilities: [{ id: 'summarize', description: 'Executive summary and key topics' }],
    dependencies: [],
    workflows: ['meeting-intelligence'],
    critical: true,
    retryable: true,
    maxRetries: DEFAULT_MAX_RETRIES,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    enabled: true,
  },
  {
    id: 'task-extractor',
    name: 'Task Extraction Agent',
    version: '2.1.0',
    description: 'Extracts actionable tasks with assignees and deadlines',
    capabilities: [{ id: 'extract-tasks', description: 'Action item extraction' }],
    dependencies: [],
    workflows: ['meeting-intelligence'],
    critical: false,
    retryable: true,
    maxRetries: DEFAULT_MAX_RETRIES,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    enabled: true,
  },
  {
    id: 'decision',
    name: 'Decision Agent',
    version: '2.1.0',
    description: 'Extracts formal decisions and rationale',
    capabilities: [{ id: 'extract-decisions', description: 'Decision detection' }],
    dependencies: [],
    workflows: ['meeting-intelligence'],
    critical: false,
    retryable: true,
    maxRetries: DEFAULT_MAX_RETRIES,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    enabled: true,
  },
  {
    id: 'risk-analyzer',
    name: 'Risk Analyzer Agent',
    version: '2.1.0',
    description: 'Identifies risks, blockers, and concerns',
    capabilities: [{ id: 'analyze-risks', description: 'Risk identification' }],
    dependencies: ['summarizer', 'decision'],
    workflows: ['meeting-intelligence'],
    critical: false,
    retryable: true,
    maxRetries: DEFAULT_MAX_RETRIES,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    enabled: true,
  },
  {
    id: 'knowledge',
    name: 'Knowledge Agent',
    version: '1.0.0',
    description: 'Extracts durable knowledge entities for workspace KB',
    capabilities: [{ id: 'extract-knowledge', description: 'Knowledge entity extraction' }],
    dependencies: ['summarizer', 'decision'],
    workflows: ['meeting-intelligence', 'knowledge-update'],
    critical: false,
    retryable: true,
    maxRetries: 1,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    enabled: true,
  },
  {
    id: 'weekly-report',
    name: 'Weekly Report Agent',
    version: '1.0.0',
    description: 'Synthesizes workspace activity into weekly intelligence report',
    capabilities: [{ id: 'generate-report', description: 'Weekly report generation' }],
    dependencies: ['retriever', 'context-builder'],
    workflows: ['weekly-report'],
    critical: false,
    retryable: true,
    maxRetries: 1,
    timeoutMs: 180_000,
    enabled: true,
  },
  {
    id: 'chat',
    name: 'Chat Agent',
    version: '2.0.0',
    description: 'Answers user questions grounded in workspace knowledge',
    capabilities: [
      { id: 'chat', description: 'Conversational Q&A' },
      { id: 'stream', description: 'SSE streaming responses' },
    ],
    dependencies: ['retriever', 'context-builder'],
    workflows: ['chat'],
    critical: true,
    retryable: true,
    maxRetries: 1,
    timeoutMs: 120_000,
    enabled: true,
  },
  {
    id: 'retriever',
    name: 'Retriever Agent',
    version: '1.0.0',
    description: 'Hybrid search for relevant document chunks',
    capabilities: [{ id: 'retrieve', description: 'Hybrid vector + FTS retrieval' }],
    dependencies: [],
    workflows: ['chat', 'weekly-report'],
    critical: false,
    retryable: true,
    maxRetries: 2,
    timeoutMs: 30_000,
    enabled: true,
  },
  {
    id: 'context-builder',
    name: 'Context Builder Agent',
    version: '1.0.0',
    description: 'Assembles retrieved chunks into token-budgeted context',
    capabilities: [{ id: 'build-context', description: 'Context assembly with citations' }],
    dependencies: ['retriever'],
    workflows: ['chat', 'weekly-report'],
    critical: false,
    retryable: false,
    maxRetries: 0,
    timeoutMs: 5_000,
    enabled: true,
  },
];

export class AgentRegistry {
  private readonly agents = new Map<AgentType, RegisteredAgent>();

  constructor() {
    for (const metadata of BUILTIN_AGENTS) {
      this.register(metadata);
    }
  }

  register(metadata: AgentMetadata): void {
    this.agents.set(metadata.id, {
      metadata,
      registeredAt: new Date().toISOString(),
    });
  }

  unregister(agentId: AgentType): boolean {
    return this.agents.delete(agentId);
  }

  get(agentId: AgentType): RegisteredAgent | undefined {
    return this.agents.get(agentId);
  }

  getMetadata(agentId: AgentType): AgentMetadata | undefined {
    return this.agents.get(agentId)?.metadata;
  }

  list(): RegisteredAgent[] {
    return [...this.agents.values()];
  }

  listByWorkflow(workflowId: string): AgentMetadata[] {
    return this.list()
      .map((entry) => entry.metadata)
      .filter((meta) => meta.workflows.includes(workflowId as AgentMetadata['workflows'][number]))
      .filter((meta) => meta.enabled);
  }

  isEnabled(agentId: AgentType): boolean {
    return this.agents.get(agentId)?.metadata.enabled ?? false;
  }

  setEnabled(agentId: AgentType, enabled: boolean): void {
    const entry = this.agents.get(agentId);
    if (entry) {
      entry.metadata.enabled = enabled;
    }
  }
}

export const agentRegistry = new AgentRegistry();
