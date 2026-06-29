import { estimateTokens } from '../../../lib/token-estimate';
import { promptRegistry } from '../../prompts/services/prompt-registry.service';
import type { ContextBlock, RAGPromptPackage } from '../types/rag.types';
import { contextBuilderService } from '../context-builders/context-builder.service';
import { tokenBudgetService, RAG_TOKEN_BUDGETS } from '../services/token-budget.service';

const DEFAULT_CHAT_PROMPT_ID = 'chat-agent';

export class PromptBuilderService {
  build(
    systemPromptId: string,
    contextBlocks: ContextBlock[],
    history: Array<{ role: string; content: string }>,
    userQuery: string,
    extraVariables: Record<string, string> = {},
  ): RAGPromptPackage {
    const contextText = contextBuilderService.formatBlocks(contextBlocks);
    const rendered = promptRegistry.render(systemPromptId, {
      variables: {
        contextBlocks: contextText,
        userMessage: userQuery,
        workspaceName: extraVariables.workspaceName ?? 'Workspace',
        scope: extraVariables.scope ?? 'workspace',
        chatHistory: extraVariables.chatHistory ?? '',
        ...extraVariables,
      },
    });

    const systemContent =
      rendered?.messages[0]?.content ??
      [
        'You are MeetingMind AI. Answer only using the provided meeting context.',
        'If the context is insufficient, say you do not have that information in the user meetings.',
        'Cite sources using [CITATION-N] matching the context blocks.',
      ].join('\n');

    const trimmedHistory = tokenBudgetService.trimHistory(
      history,
      RAG_TOKEN_BUDGETS.chatHistory,
    );

    const messages: RAGPromptPackage['messages'] = [
      { role: 'system', content: systemContent },
      ...trimmedHistory.map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      })),
      {
        role: 'user',
        content: [
          'Context:',
          contextText || 'No relevant meeting context was retrieved.',
          '',
          'Question:',
          tokenBudgetService.trimText(userQuery, RAG_TOKEN_BUDGETS.userQuery),
        ].join('\n'),
      },
    ];

    const totalTokens = messages.reduce(
      (sum, message) => sum + estimateTokens(message.content),
      0,
    );

    return {
      messages,
      totalTokens,
      promptId: rendered?.id ?? DEFAULT_CHAT_PROMPT_ID,
      promptVersion: rendered?.version ?? '0.0.0',
    };
  }
}

export const promptBuilderService = new PromptBuilderService();
