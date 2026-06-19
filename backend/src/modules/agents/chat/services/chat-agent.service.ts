import { randomUUID } from 'crypto';
import { llmService } from '../../../llm';
import { ragService } from '../../../rag';
import { citationParserService } from '../../../rag/services/citation-parser.service';
import type { IAgent, AgentMessage } from '../../types/agent.types';
import type { ChatAgentInput, ChatAgentOutput } from '../types/chat-agent.types';
import type { ContextBlock } from '../../../rag/types/rag.types';

export interface ChatTurnPackage {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  contextBlocks: ContextBlock[];
  promptTokens: number;
}

export interface ChatTurnResult {
  content: string;
  citations: Array<{
    index: number;
    chunkId: string;
    excerpt: string;
    meetingId?: string;
    meetingTitle?: string;
  }>;
  promptTokens: number;
  completionTokens: number;
  model: string;
  provider: string;
}

export class ChatAgentService implements IAgent<ChatAgentInput, ChatAgentOutput> {
  readonly type = 'chat' as const;

  async prepareTurn(input: ChatAgentInput, _correlationId: string): Promise<ChatTurnPackage> {
    const pipeline = await ragService.prepareChatPrompt(
      {
        query: input.userMessage,
        workspaceId: input.workspaceId,
        meetingId: input.meetingId,
        mode: 'hybrid',
        topK: input.meetingId ? 8 : 10,
      },
      input.chatHistory,
    );

    return {
      messages: pipeline.prompt.messages,
      contextBlocks: pipeline.context.blocks,
      promptTokens: pipeline.prompt.totalTokens,
    };
  }

  private mapCitations(content: string, contextBlocks: ContextBlock[]) {
    return citationParserService.mapCitations(content, contextBlocks).map((citation) => ({
      index: citation.index,
      chunkId: citation.chunkId ?? '',
      excerpt: citation.excerpt ?? '',
      meetingId: citation.meetingId,
      meetingTitle: citation.meetingTitle,
    }));
  }

  async runTurn(input: ChatAgentInput, correlationId: string): Promise<ChatTurnResult> {
    const turn = await this.prepareTurn(input, correlationId);

    const response = await llmService.complete(
      {
        workflow: 'chat',
        messages: turn.messages,
        workspaceId: input.workspaceId,
        correlationId,
      },
      { promptId: 'chat-agent', promptVersion: '1.0.0' },
    );

    return {
      content: response.content,
      citations: this.mapCitations(response.content, turn.contextBlocks),
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
      model: response.model,
      provider: response.provider,
    };
  }

  async execute(
    message: AgentMessage<ChatAgentInput, ChatAgentOutput>,
  ): Promise<AgentMessage<ChatAgentInput, ChatAgentOutput>> {
    const startedAt = Date.now();
    const result = await this.runTurn(message.input, message.correlationId);

    return {
      ...message,
      output: {
        content: result.content,
        citations: result.citations.map((citation) => ({
          index: citation.index,
          chunkId: citation.chunkId,
          excerpt: citation.excerpt,
        })),
      },
      status: 'completed',
      metrics: {
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        model: result.model,
        provider: result.provider,
      },
    };
  }

  async *streamTurn(
    input: ChatAgentInput,
    correlationId: string,
  ): AsyncGenerator<
    | { type: 'token'; content: string }
    | {
        type: 'done';
        content: string;
        promptTokens: number;
        completionTokens: number;
        contextBlocks: ContextBlock[];
      }
  > {
    const turn = await this.prepareTurn(input, correlationId);
    let content = '';

    for await (const chunk of llmService.completeStream(
      {
        workflow: 'chat',
        messages: turn.messages,
        workspaceId: input.workspaceId,
        correlationId,
      },
      { promptId: 'chat-agent', promptVersion: '1.0.0' },
    )) {
      if (chunk.content) {
        content += chunk.content;
        yield { type: 'token', content: chunk.content };
      }

      if (chunk.done) {
        yield {
          type: 'done',
          content,
          promptTokens: turn.promptTokens,
          completionTokens: Math.ceil(content.length / 4),
          contextBlocks: turn.contextBlocks,
        };
      }
    }
  }
}

export const chatAgent = new ChatAgentService();

export function buildChatCorrelationId(): string {
  return randomUUID();
}
