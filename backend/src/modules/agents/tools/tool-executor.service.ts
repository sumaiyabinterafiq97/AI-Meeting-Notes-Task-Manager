import { withRetry } from '../../llm/services/retry-handler.service';
import { env } from '../../../config/env';
import { ALL_AGENT_TOOLS } from './agent-tools';
import type {
  AgentTool,
  AgentToolContext,
  AgentToolResult,
  ToolCallRequest,
} from './types/tool.types';

export class ToolRegistryService {
  private readonly tools = new Map<string, AgentTool<Record<string, unknown>, unknown>>();

  constructor() {
    for (const tool of ALL_AGENT_TOOLS) {
      this.tools.set(tool.name, tool as unknown as AgentTool<Record<string, unknown>, unknown>);
    }
  }

  list(): AgentTool<Record<string, unknown>, unknown>[] {
    return Array.from(this.tools.values());
  }

  get(name: string): AgentTool<Record<string, unknown>, unknown> | undefined {
    return this.tools.get(name);
  }

  register(tool: AgentTool<Record<string, unknown>, unknown>): void {
    this.tools.set(tool.name, tool);
  }

  getToolDefinitions(): Array<{
    type: 'function';
    function: { name: string; description: string; parameters: Record<string, unknown> };
  }> {
    return this.list().map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }
}

export class ToolExecutorService {
  constructor(private readonly registry: ToolRegistryService) {}

  async execute(
    request: ToolCallRequest,
    context: AgentToolContext,
  ): Promise<AgentToolResult> {
    const startedAt = Date.now();
    const tool = this.registry.get(request.name);

    if (!tool) {
      return {
        toolName: request.name,
        success: false,
        error: `Unknown tool: ${request.name}`,
        latencyMs: Date.now() - startedAt,
      };
    }

    try {
      const data = await withRetry(
        () => tool.execute(request.arguments as never, context),
        { maxAttempts: env.LLM_MAX_RETRIES },
      );

      return {
        toolName: request.name,
        success: true,
        data,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        toolName: request.name,
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
        latencyMs: Date.now() - startedAt,
      };
    }
  }

  async executeMany(
    requests: ToolCallRequest[],
    context: AgentToolContext,
  ): Promise<AgentToolResult[]> {
    return Promise.all(requests.map((request) => this.execute(request, context)));
  }
}

export const toolRegistryService = new ToolRegistryService();
export const toolExecutorService = new ToolExecutorService(toolRegistryService);
