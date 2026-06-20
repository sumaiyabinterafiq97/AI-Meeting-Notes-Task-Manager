import type { ChatQueryIntent } from '../types/query-classifier.types';
import type { QueryRetrievalHints } from '../types/query-classifier.types';

export const VALID_CHAT_QUERY_INTENTS: readonly ChatQueryIntent[] = [
  'factual_lookup',
  'synthesis',
  'comparison',
  'task_query',
  'meeting_query',
  'general',
] as const;

export const RULE_CLASSIFIER_CONFIDENCE = 0.82;
export const LLM_CLASSIFIER_CONFIDENCE = 0.75;
export const AMBIGUOUS_RULE_CONFIDENCE = 0.45;

export const INTENT_RETRIEVAL_HINTS: Record<ChatQueryIntent, QueryRetrievalHints> = {
  task_query: { sourceTypes: ['action_item'], topK: 8, mode: 'keyword' },
  meeting_query: { sourceTypes: ['transcript', 'summary'], topK: 10, mode: 'hybrid' },
  factual_lookup: { sourceTypes: ['decision', 'summary', 'action_item'], topK: 8, mode: 'hybrid' },
  synthesis: { topK: 12, mode: 'hybrid' },
  comparison: { topK: 12, mode: 'hybrid' },
  general: { topK: 10, mode: 'hybrid' },
};

export const INTENT_RULE_PATTERNS: Array<{ intent: ChatQueryIntent; patterns: RegExp[] }> = [
  {
    intent: 'comparison',
    patterns: [
      /\bcompare\b/i,
      /\bchanged?\b/i,
      /\bdifference\b/i,
      /\bvs\.?\b/i,
      /\bversus\b/i,
      /\bbefore and after\b/i,
      /\bdid we change\b/i,
    ],
  },
  {
    intent: 'task_query',
    patterns: [
      /\btasks?\b/i,
      /\baction items?\b/i,
      /\bassigned to\b/i,
      /\bassignee\b/i,
      /\bpending\b/i,
      /\btodo\b/i,
      /\bwho owns\b/i,
      /\bstill open\b/i,
    ],
  },
  {
    intent: 'synthesis',
    patterns: [
      /\bsummarize\b/i,
      /\bsummary\b/i,
      /\boverview\b/i,
      /\brecap\b/i,
      /\bwhat happened\b/i,
      /\bgive me the highlights\b/i,
    ],
  },
  {
    intent: 'meeting_query',
    patterns: [
      /\bmeetings?\b/i,
      /\bdiscussed\b/i,
      /\btranscript\b/i,
      /\bstandup\b/i,
      /\bretro\b/i,
      /\bsprint planning\b/i,
      /\blast week'?s?\b/i,
    ],
  },
  {
    intent: 'factual_lookup',
    patterns: [
      /\bdecisions?\b/i,
      /\brisks?\b/i,
      /\bwho\b/i,
      /\bwhen did\b/i,
      /\bwhat did we\b/i,
      /\bshow me\b/i,
    ],
  },
];
