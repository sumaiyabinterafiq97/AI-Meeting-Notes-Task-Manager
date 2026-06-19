import { LlmInvocationStatus } from '@prisma/client';
import { AppError, ErrorCodes } from '../../../utils/errors';
import { env } from '../../../config/env';
import { logLLMError, logLLMInvocation } from '../../observability/logging/llm-logger';
import { tokenMonitorService } from '../../observability/token-monitoring/token-monitor.service';
import { LLMProviderError, LLMTokenBudgetError } from '../errors/llm.errors';
import { getDefaultModelForProvider } from '../config/model-catalog';
import type { ILLMProvider } from '../interfaces/llm-provider.interface';
import type {
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMEmbedRequest,
  LLMEmbedResponse,
  LLMProviderId,
  LLMStreamChunk,
  LLMWorkflow,
} from '../types/llm.types';
import { circuitBreakerService } from './circuit-breaker.service';
import { getConfiguredProvider, resolveProviderChain } from './fallback-manager.service';
import { completeWithJsonRepair } from './output-validator.service';
import { withRetry } from './retry-handler.service';

export interface LLMServiceOptions {
  providerOverride?: LLMProviderId;
  requestId?: string;
  promptId?: string;
  promptVersion?: string;
}

export class LLMService {
  resolveProvider(workflow: LLMWorkflow, override?: LLMProviderId): LLMProviderId {
    return resolveProviderChain(workflow, override)[0] ?? 'mock';
  }

  getProvider(workflow: LLMWorkflow, override?: LLMProviderId): ILLMProvider {
    const providerId = this.resolveProvider(workflow, override);
    return getConfiguredProvider(providerId);
  }

  async complete(
    request: LLMCompletionRequest,
    options: LLMServiceOptions = {},
  ): Promise<LLMCompletionResponse> {
    const workflow = request.workflow ?? 'process-meeting';
    const providerChain = resolveProviderChain(workflow, options.providerOverride);

    if (providerChain.length === 0) {
      throw new AppError(503, ErrorCodes.INTERNAL_ERROR, 'AI temporarily unavailable');
    }

    if (request.workspaceId) {
      await tokenMonitorService.assertWorkspaceBudget(request.workspaceId);
    }

    const startedAt = Date.now();
    let lastError: unknown;

    for (const providerId of providerChain) {
      if (circuitBreakerService.isOpen(providerId)) {
        continue;
      }

      const provider = getConfiguredProvider(providerId);
      const model = request.model ?? getDefaultModelForProvider(providerId, workflow);

      try {
        const response = await withRetry(
          () =>
            completeWithJsonRepair(provider, {
              ...request,
              model,
              workflow,
            }),
          { maxAttempts: env.LLM_MAX_RETRIES },
        );

        circuitBreakerService.recordSuccess(providerId);
        await this.logSuccess(request, response, Date.now() - startedAt, options);

        return response;
      } catch (error) {
        lastError = error;
        circuitBreakerService.recordFailure(providerId);
        logLLMError(
          {
            correlationId: request.correlationId,
            workspaceId: request.workspaceId,
            workflow,
            provider: providerId,
            model,
          },
          error instanceof Error ? error : new Error('LLM completion failed'),
        );
      }
    }

    if (request.workspaceId) {
      await this.logFailure(request, lastError, Date.now() - startedAt, options);
    }

    if (lastError instanceof LLMTokenBudgetError) {
      throw new AppError(429, ErrorCodes.RATE_LIMITED, lastError.message);
    }

    throw new AppError(503, ErrorCodes.INTERNAL_ERROR, 'AI temporarily unavailable');
  }

  async *completeStream(
    request: LLMCompletionRequest,
    options: LLMServiceOptions = {},
  ): AsyncIterable<LLMStreamChunk> {
    const workflow = request.workflow ?? 'chat';
    const providerId = this.resolveProvider(workflow, options.providerOverride);
    const provider = getConfiguredProvider(providerId);

    if (!provider.completeStream) {
      const response = await this.complete(request, options);
      yield { content: response.content, done: false };
      yield { content: '', done: true };
      return;
    }

    if (request.workspaceId) {
      await tokenMonitorService.assertWorkspaceBudget(request.workspaceId);
    }

    const startedAt = Date.now();
    let totalContent = '';

    try {
      for await (const chunk of provider.completeStream({
        ...request,
        model: request.model ?? getDefaultModelForProvider(providerId, workflow),
        workflow,
      })) {
        if (chunk.content) {
          totalContent += chunk.content;
        }
        yield chunk;
      }

      const promptTokens = request.messages.reduce(
        (sum, message) => sum + Math.ceil(message.content.length / 4),
        0,
      );
      const completionTokens = Math.ceil(totalContent.length / 4);
      const model = request.model ?? getDefaultModelForProvider(providerId, workflow);

      await this.logSuccess(
        request,
        {
          content: totalContent,
          model,
          provider: providerId,
          promptTokens,
          completionTokens,
          finishReason: 'stop',
        },
        Date.now() - startedAt,
        options,
      );
    } catch (error) {
      await this.logFailure(request, error, Date.now() - startedAt, options);
      throw error;
    }
  }

  async embed(
    request: LLMEmbedRequest,
    options: LLMServiceOptions = {},
  ): Promise<LLMEmbedResponse> {
    const workflow: LLMWorkflow = 'embed';
    const providerChain = resolveProviderChain(workflow, options.providerOverride);

    if (request.workspaceId) {
      await tokenMonitorService.assertWorkspaceBudget(request.workspaceId);
    }

    const startedAt = Date.now();
    let lastError: unknown;

    for (const providerId of providerChain) {
      if (circuitBreakerService.isOpen(providerId)) continue;

      const provider = getConfiguredProvider(providerId);

      try {
        const response = await withRetry(
          () =>
            provider.embed({
              ...request,
              model: request.model ?? getDefaultModelForProvider(providerId, workflow),
            }),
          { maxAttempts: env.LLM_MAX_RETRIES },
        );

        circuitBreakerService.recordSuccess(providerId);

        if (request.workspaceId) {
          await tokenMonitorService.record({
            workspaceId: request.workspaceId,
            workflow,
            provider: providerId,
            model: response.model,
            promptTokens: response.totalTokens,
            completionTokens: 0,
            estimatedCostUsd: tokenMonitorService.estimateCost(
              response.model,
              response.totalTokens,
              0,
            ),
            latencyMs: Date.now() - startedAt,
            correlationId: options.requestId,
            requestId: options.requestId,
            status: LlmInvocationStatus.COMPLETED,
          });
        }

        return response;
      } catch (error) {
        lastError = error;
        circuitBreakerService.recordFailure(providerId);
      }
    }

    if (lastError instanceof LLMTokenBudgetError) {
      throw new AppError(429, ErrorCodes.RATE_LIMITED, lastError.message);
    }

    throw new AppError(503, ErrorCodes.INTERNAL_ERROR, 'AI temporarily unavailable');
  }

  private async logSuccess(
    request: LLMCompletionRequest,
    response: LLMCompletionResponse,
    latencyMs: number,
    options: LLMServiceOptions,
  ): Promise<void> {
    logLLMInvocation(
      {
        correlationId: request.correlationId,
        workspaceId: request.workspaceId,
        workflow: request.workflow,
        provider: response.provider,
        model: response.model,
      },
      'LLM invocation completed',
    );

    if (!request.workspaceId) return;

    await tokenMonitorService.record({
      workspaceId: request.workspaceId,
      workflow: request.workflow ?? 'process-meeting',
      provider: response.provider,
      model: response.model,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
      estimatedCostUsd: tokenMonitorService.estimateCost(
        response.model,
        response.promptTokens,
        response.completionTokens,
      ),
      latencyMs,
      correlationId: request.correlationId,
      requestId: options.requestId,
      promptId: options.promptId,
      promptVersion: options.promptVersion,
      status: LlmInvocationStatus.COMPLETED,
    });
  }

  private async logFailure(
    request: LLMCompletionRequest,
    error: unknown,
    latencyMs: number,
    options: LLMServiceOptions,
  ): Promise<void> {
    if (!request.workspaceId) return;

    const message = error instanceof Error ? error.message : 'LLM invocation failed';
    const providerId =
      error instanceof LLMProviderError ? error.provider : this.resolveProvider(request.workflow ?? 'process-meeting');

    await tokenMonitorService.record({
      workspaceId: request.workspaceId,
      workflow: request.workflow ?? 'process-meeting',
      provider: providerId,
      model: request.model ?? 'unknown',
      promptTokens: 0,
      completionTokens: 0,
      estimatedCostUsd: 0,
      latencyMs,
      correlationId: request.correlationId,
      requestId: options.requestId,
      promptId: options.promptId,
      promptVersion: options.promptVersion,
      status: LlmInvocationStatus.FAILED,
      errorMessage: message,
    });
  }
}

export const llmService = new LLMService();
