import { randomUUID } from 'crypto';
import { llmService } from '../../llm';
import type { LLMWorkflow } from '../../llm/types/llm.types';
import { promptRegistry } from '../../prompts/services/prompt-registry.service';
import type { AgentMessage, AgentType } from '../types/agent.types';
import { agentExecutionService } from './agent-execution.service';

export interface StructuredAgentRunParams<TInput, TOutput> {
  agentType: AgentType;
  promptId: string;
  workflow: LLMWorkflow;
  jsonSchema: Record<string, unknown>;
  message: AgentMessage<TInput, TOutput>;
  variables: Record<string, string>;
  userContent: string;
  fallbackOutput: TOutput;
  jobId?: string;
}

function buildFallbackMessage<TInput, TOutput>(
  message: AgentMessage<TInput, TOutput>,
  output: TOutput,
  error: { code: string; message: string },
  startedAt: number,
): AgentMessage<TInput, TOutput> {
  return {
    ...message,
    output,
    status: 'failed',
    error: { ...error, retryable: true },
    metrics: {
      ...message.metrics,
      completedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    },
  };
}

export async function runStructuredAgent<TInput, TOutput>(
  params: StructuredAgentRunParams<TInput, TOutput>,
): Promise<AgentMessage<TInput, TOutput>> {
  const startedAt = Date.now();
  const runningMessage: AgentMessage<TInput, TOutput> = {
    ...params.message,
    status: 'running',
    metrics: {
      ...params.message.metrics,
      startedAt: new Date(startedAt).toISOString(),
    },
  };

  const execution = await agentExecutionService.start({
    jobId: params.jobId ?? params.message.jobId,
    workspaceId: params.message.workspaceId,
    meetingId: params.message.meetingId,
    correlationId: params.message.correlationId,
    agentType: params.agentType,
  });

  const rendered = promptRegistry.render(params.promptId, { variables: params.variables });
  const systemContent =
    rendered?.messages[0]?.content ??
    'You are a meeting analysis agent. Return valid JSON only matching the required schema.';

  try {
    const response = await llmService.complete(
      {
        workflow: params.workflow,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: params.userContent },
        ],
        responseFormat: 'json_schema',
        jsonSchema: params.jsonSchema,
        workspaceId: params.message.workspaceId,
        correlationId: params.message.correlationId,
      },
      {
        promptId: params.promptId,
        promptVersion: rendered?.version ?? '0.0.0',
      },
    );

    const output = JSON.parse(response.content) as TOutput;
    const latencyMs = Date.now() - startedAt;

    await agentExecutionService.complete(execution.id, {
      inputTokens: response.promptTokens,
      outputTokens: response.completionTokens,
      latencyMs,
      model: response.model,
      provider: response.provider,
    });

    return {
      ...runningMessage,
      output,
      status: 'completed',
      metrics: {
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        latencyMs,
        promptTokens: response.promptTokens,
        completionTokens: response.completionTokens,
        model: response.model,
        provider: response.provider,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Agent execution failed';
    const latencyMs = Date.now() - startedAt;

    await agentExecutionService.fail(execution.id, message, latencyMs);

    return buildFallbackMessage(
      runningMessage,
      params.fallbackOutput,
      { code: 'AGENT_EXECUTION_FAILED', message },
      startedAt,
    );
  }
}

export function createAgentMessage<TInput>(
  agentType: AgentType,
  workspaceId: string,
  input: TInput,
  options?: { meetingId?: string; correlationId?: string; jobId?: string },
): AgentMessage<TInput, never> {
  return {
    id: randomUUID(),
    correlationId: options?.correlationId ?? randomUUID(),
    agentType,
    workspaceId,
    meetingId: options?.meetingId,
    jobId: options?.jobId,
    input,
    status: 'pending',
    metrics: { startedAt: new Date().toISOString() },
  };
}
