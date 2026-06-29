export const EMPTY_CONTEXT_RESPONSE =
  "I couldn't find relevant information in your meetings for that question. Try rephrasing or ask about a specific meeting.";

export const INJECTION_REFUSAL_RESPONSE =
  "I can't process that request. Please ask a question about your meetings, tasks, decisions, or risks.";

export const FALLBACK_CHAT_RESPONSE =
  'I was unable to generate a response right now. Please try again in a moment.';

export const CITATION_EXCERPT_LENGTH = 200;
export const CLAIM_TEXT_MAX_LENGTH = 300;

export const REFUSAL_PATTERNS = [
  /couldn't find relevant information/i,
  /don't have information about that/i,
  /no relevant meetings were found/i,
  /I can only answer based on your meeting records/i,
] as const;
