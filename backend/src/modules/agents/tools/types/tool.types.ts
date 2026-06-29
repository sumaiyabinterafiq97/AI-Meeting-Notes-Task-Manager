export interface AgentToolContext {
  workspaceId: string;
  meetingId?: string;
  correlationId?: string;
}

export interface AgentToolResult<T = unknown> {
  toolName: string;
  success: boolean;
  data?: T;
  error?: string;
  latencyMs: number;
}

export interface AgentTool<TInput = Record<string, unknown>, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  execute(input: TInput, context: AgentToolContext): Promise<TOutput>;
}

export interface ToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
}
