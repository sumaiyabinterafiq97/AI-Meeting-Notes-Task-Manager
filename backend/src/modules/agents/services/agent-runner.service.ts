import { randomUUID } from 'crypto';
import type { z } from 'zod';
import { llmService } from '../../llm';
import type { LLMWorkflow } from '../../llm/types/llm.types';
import { validateWithZod } from '../../llm/services/zod-validator.service';
import { promptRegistry } from '../../prompts/services/prompt-registry.service';
import type { AgentMessage, AgentType } from '../types/agent.types';
import { agentTypeToSchemaKey, resolveJsonSchema, resolveZodSchema } from '../schemas/schema-resolver';
import { completeStructured } from '../schemas/structured-output.service';
import { inputSanitizerService } from '../security/input-sanitizer.service';
import { agentExecutionService } from './agent-execution.service';

export interface StructuredAgentRunParams<TInput, TOutput> {
  agentType: AgentType;
  promptId: string;
  workflow: LLMWorkflow;
  jsonSchema?: Record<string, unknown>;
  zodSchema?: z.ZodType<TOutput>;
  message: AgentMessage<TInput, TOutput>;
  variables: Record<string, string>;
  userContent: string;
  fallbackOutput: TOutput;
  jobId?: string;
  sanitizeTranscript?: boolean;
  normalizeOutput?: (output: TOutput) => TOutput;
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

  const sanitizedVariables = Object.fromEntries(
    Object.entries(params.variables).map(([key, value]) => [
      key,
      key === 'transcript' || params.sanitizeTranscript !== false
        ? inputSanitizerService.sanitizeText(value, {
            field: key === 'transcript' ? 'transcript' : 'promptVar',
          })
        : value,
    ]),
  );

  const rendered = promptRegistry.render(params.promptId, { variables: sanitizedVariables });
  const systemContent =
    rendered?.messages[0]?.content ??
    'You are a meeting analysis agent. Return valid JSON only matching the required schema.';

  const schemaKey = agentTypeToSchemaKey(params.agentType);
  const jsonSchema =
    params.jsonSchema ??
    (schemaKey ? resolveJsonSchema(schemaKey) : undefined) ??
    ({} as Record<string, unknown>);
  const zodSchema =
    params.zodSchema ?? (schemaKey ? (resolveZodSchema(schemaKey) as z.ZodType<TOutput>) : undefined);

  const userContent = params.sanitizeTranscript !== false
    ? inputSanitizerService.wrapUntrustedContent('USER_INPUT', params.userContent)
    : params.userContent;

  try {
    const messages = [
      { role: 'system' as const, content: systemContent },
      { role: 'user' as const, content: userContent },
    ];

    let output: TOutput;
    let response;

    if (schemaKey && zodSchema && Object.keys(jsonSchema).length > 0) {
      const structured = await completeStructured<TOutput>(
        schemaKey,
        {
          workflow: params.workflow,
          messages,
          workspaceId: params.message.workspaceId,
          correlationId: params.message.correlationId,
        },
        {
          promptId: params.promptId,
          promptVersion: rendered?.version ?? '0.0.0',
          zodSchema,
        },
      );
      response = structured.response;
      output = structured.parsed;
    } else {
      response = await llmService.complete(
        {
          workflow: params.workflow,
          messages,
          responseFormat: 'json_schema',
          jsonSchema,
          workspaceId: params.message.workspaceId,
          correlationId: params.message.correlationId,
        },
        {
          promptId: params.promptId,
          promptVersion: rendered?.version ?? '0.0.0',
        },
      );

      if (zodSchema) {
        output = validateWithZod(zodSchema, response.content);
      } else {
        output = JSON.parse(response.content) as TOutput;
      }
    }

    if (params.normalizeOutput) {
      output = params.normalizeOutput(output);
    }

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
