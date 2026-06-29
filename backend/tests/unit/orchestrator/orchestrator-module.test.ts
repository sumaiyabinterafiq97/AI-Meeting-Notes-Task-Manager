import { agentRegistry } from '../../../src/modules/orchestrator/agents/registry/agent-registry';
import { WORKFLOW_REGISTRY, getWorkflowDefinition } from '../../../src/modules/orchestrator/workflows/workflow.types';
import { mergeAgentResults, createInitialState } from '../../../src/modules/orchestrator/state/reducers';
import { withRetry, isRetryableError } from '../../../src/modules/orchestrator/executors/retry.executor';
import { CircuitBreaker } from '../../../src/modules/orchestrator/executors/circuit-breaker.executor';
import { InMemoryCheckpointStore } from '../../../src/modules/orchestrator/checkpoints/checkpoint-store';
import { EventBusService } from '../../../src/modules/orchestrator/events/event-bus.service';
import { meetingIntelligenceNodes } from '../../../src/modules/orchestrator/nodes';
import { graphExecutorService } from '../../../src/modules/orchestrator/executors/graph-executor.service';

describe('agent registry', () => {
  it('registers all built-in agents', () => {
    const agents = agentRegistry.list();
    expect(agents.length).toBeGreaterThanOrEqual(8);
    expect(agentRegistry.getMetadata('summarizer')?.critical).toBe(true);
    expect(agentRegistry.getMetadata('risk-analyzer')?.dependencies).toContain('summarizer');
  });

  it('lists agents by workflow', () => {
    const chatAgents = agentRegistry.listByWorkflow('chat');
    expect(chatAgents.map((a) => a.id)).toEqual(
      expect.arrayContaining(['chat', 'retriever', 'context-builder']),
    );
  });

  it('supports dynamic registration', () => {
    const registry = agentRegistry;
    const before = registry.list().length;
    registry.register({
      id: 'summarizer',
      name: 'Summarizer v3',
      version: '3.0.0',
      description: 'Updated',
      capabilities: [],
      dependencies: [],
      workflows: ['meeting-intelligence'],
      critical: true,
      retryable: true,
      maxRetries: 2,
      timeoutMs: 120_000,
      enabled: true,
    });
    expect(registry.getMetadata('summarizer')?.version).toBe('3.0.0');
    expect(registry.list().length).toBe(before);
  });
});

describe('workflow definitions', () => {
  it('defines four workflows without hardcoded execution in nodes', () => {
    expect(Object.keys(WORKFLOW_REGISTRY)).toEqual([
      'meeting-intelligence',
      'weekly-report',
      'chat',
      'knowledge-update',
    ]);
  });

  it('meeting-intelligence has parallel extraction edges from start', () => {
    const workflow = getWorkflowDefinition('meeting-intelligence');
    const parallelStarts = workflow.edges.filter((e) => e.from === '__start__');
    expect(parallelStarts.map((e) => e.to)).toEqual(
      expect.arrayContaining(['summarizer', 'task_extractor', 'decision']),
    );
  });

  it('maps all workflow nodes to handlers', () => {
    const workflow = getWorkflowDefinition('meeting-intelligence');
    for (const node of workflow.nodes) {
      expect(meetingIntelligenceNodes[node.id]).toBeDefined();
    }
  });
});

describe('state reducers', () => {
  it('merges agent results', () => {
    const merged = mergeAgentResults(
      { summarizer: { id: '1' } as never },
      { decision: { id: '2' } as never },
    );
    expect(merged.summarizer).toBeDefined();
    expect(merged.decision).toBeDefined();
  });

  it('creates initial state with defaults', () => {
    const state = createInitialState({
      workflowId: 'chat',
      correlationId: 'corr-1',
      workspaceId: 'ws-1',
      input: { query: 'hello' },
    });
    expect(state.status).toBe('pending');
    expect(state.tokenBudget.exceeded).toBe(false);
  });
});

describe('retry executor', () => {
  it('retries retryable errors', async () => {
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts += 1;
      if (attempts < 2) throw new Error('429 rate limited');
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(attempts).toBe(2);
  });

  it('detects retryable timeout errors', () => {
    expect(isRetryableError(new Error('request timeout'))).toBe(true);
    expect(isRetryableError(new Error('validation failed'))).toBe(false);
  });
});

describe('circuit breaker', () => {
  it('opens after threshold failures', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, resetMs: 60_000 });
    const fail = () => breaker.execute('test-key', () => Promise.reject(new Error('fail')));

    await expect(fail()).rejects.toThrow();
    await expect(fail()).rejects.toThrow();
    await expect(breaker.execute('test-key', () => Promise.resolve('ok'))).rejects.toThrow(
      /Circuit breaker open/,
    );
  });
});

describe('checkpoint store', () => {
  it('saves and recovers state', async () => {
    const store = new InMemoryCheckpointStore();
    const state = createInitialState({
      workflowId: 'meeting-intelligence',
      correlationId: 'job-1',
      workspaceId: 'ws-1',
      input: { transcript: 'secret transcript content' },
    });

    await store.save('job-1', state);
    const recovered = await store.load('job-1');
    expect(recovered?.state.input.transcript).toContain('[redacted:');
  });
});

describe('event bus', () => {
  it('emits typed orchestrator events', async () => {
    const bus = new EventBusService();
    const received: string[] = [];
    bus.subscribe('MeetingProcessed', (event) => {
      received.push(event.type);
    });

    await bus.emit(
      bus.createEvent('MeetingProcessed', {
        workflowId: 'meeting-intelligence',
        correlationId: 'c1',
        workspaceId: 'ws1',
        payload: {},
      }),
    );

    expect(received).toEqual(['MeetingProcessed']);
  });
});

describe('graph executor', () => {
  it('builds meeting intelligence graph', () => {
    const workflow = getWorkflowDefinition('meeting-intelligence');
    const graph = graphExecutorService.buildGraph(workflow, meetingIntelligenceNodes);
    expect(graph).toBeDefined();
  });
});
