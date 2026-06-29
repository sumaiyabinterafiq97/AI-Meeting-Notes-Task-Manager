import { z } from 'zod';
import { env } from '../../../../config/env';
import { llmService } from '../../../llm';
import { promptRegistry } from '../../../prompts';
import type { RAGQuery } from '../../../rag/types/rag.types';
import type {
  ChatQueryIntent,
  QueryClassificationResult,
} from '../types/query-classifier.types';
import {
  AMBIGUOUS_RULE_CONFIDENCE,
  INTENT_RETRIEVAL_HINTS,
  INTENT_RULE_PATTERNS,
  LLM_CLASSIFIER_CONFIDENCE,
  RULE_CLASSIFIER_CONFIDENCE,
  VALID_CHAT_QUERY_INTENTS,
} from './query-classifier.constants';

const QueryClassificationSchema = z.object({
  intent: z.enum([
    'factual_lookup',
    'synthesis',
    'comparison',
    'task_query',
    'meeting_query',
    'general',
  ]),
  confidence: z.number().min(0).max(1).optional(),
});

function normalizeIntent(value: string | undefined): ChatQueryIntent {
  if (value && VALID_CHAT_QUERY_INTENTS.includes(value as ChatQueryIntent)) {
    return value as ChatQueryIntent;
  }
  return 'general';
}

function buildResult(
  intent: ChatQueryIntent,
  confidence: number,
  method: QueryClassificationResult['method'],
): QueryClassificationResult {
  return {
    intent,
    confidence,
    method,
    retrievalHints: INTENT_RETRIEVAL_HINTS[intent],
  };
}

export function classifyQueryByRules(query: string): QueryClassificationResult {
  const normalized = query.trim();
  if (!normalized) {
    return buildResult('general', AMBIGUOUS_RULE_CONFIDENCE, 'rules');
  }

  for (const rule of INTENT_RULE_PATTERNS) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return buildResult(rule.intent, RULE_CLASSIFIER_CONFIDENCE, 'rules');
    }
  }

  return buildResult('general', AMBIGUOUS_RULE_CONFIDENCE, 'rules');
}

export class QueryClassifierService {
  classifyByRules(query: string): QueryClassificationResult {
    return classifyQueryByRules(query);
  }

  private async classifyByLlm(
    query: string,
    options: { workspaceId?: string; correlationId?: string },
  ): Promise<QueryClassificationResult | null> {
    const rendered = promptRegistry.render('chat-query-classifier', {
      variables: { query },
    });

    const systemMessage = rendered?.messages[0]?.content ??
      'Classify the user query into one intent: factual_lookup, synthesis, comparison, task_query, meeting_query, or general. Return JSON only.';

    try {
      const response = await llmService.complete(
        {
          workflow: 'chat',
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: query },
          ],
          responseFormat: 'json_schema',
          jsonSchema: {
            name: 'chat_query_classification',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                intent: {
                  type: 'string',
                  enum: [...VALID_CHAT_QUERY_INTENTS],
                },
                confidence: { type: 'number' },
              },
              required: ['intent'],
              additionalProperties: false,
            },
          },
          workspaceId: options.workspaceId,
          correlationId: options.correlationId,
          maxTokens: 64,
          temperature: 0,
        },
        { promptId: 'chat-query-classifier', promptVersion: rendered?.version ?? '1.0.0' },
      );

      const parsed = QueryClassificationSchema.parse(JSON.parse(response.content));
      return buildResult(
        normalizeIntent(parsed.intent),
        parsed.confidence ?? LLM_CLASSIFIER_CONFIDENCE,
        'llm',
      );
    } catch {
      return null;
    }
  }

  async classify(
    query: string,
    options: { workspaceId?: string; correlationId?: string } = {},
  ): Promise<QueryClassificationResult> {
    const ruleResult = this.classifyByRules(query);

    const shouldUseLlm =
      env.CHAT_QUERY_CLASSIFIER_LLM &&
      (ruleResult.confidence < RULE_CLASSIFIER_CONFIDENCE || ruleResult.intent === 'general');

    if (!shouldUseLlm) {
      return ruleResult;
    }

    const llmResult = await this.classifyByLlm(query, options);
    return llmResult ?? ruleResult;
  }

  applyToRagQuery(base: RAGQuery, classification: QueryClassificationResult): RAGQuery {
    const hints = classification.retrievalHints;
    const meetingScopedTopK = base.meetingId ? Math.max(6, (hints.topK ?? 10) - 2) : hints.topK;

    return {
      ...base,
      mode: hints.mode ?? base.mode ?? 'hybrid',
      topK: meetingScopedTopK ?? base.topK,
      sourceTypes: hints.sourceTypes ?? base.sourceTypes,
    };
  }
}

export const queryClassifierService = new QueryClassifierService();
