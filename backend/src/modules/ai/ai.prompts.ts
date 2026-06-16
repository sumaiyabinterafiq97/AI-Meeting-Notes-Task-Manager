export const MEETING_ANALYSIS_SCHEMA = {
  name: 'meeting_analysis',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      topics: {
        type: 'array',
        items: { type: 'string' },
      },
      decisions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            context: { type: 'string' },
          },
          required: ['text', 'context'],
          additionalProperties: false,
        },
      },
      risks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            severity: { type: 'string', enum: ['low', 'medium', 'high'] },
            context: { type: 'string' },
          },
          required: ['text', 'severity', 'context'],
          additionalProperties: false,
        },
      },
      actionItems: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            suggestedAssignee: { type: ['string', 'null'] },
            suggestedDueDate: { type: ['string', 'null'] },
          },
          required: ['title', 'description', 'suggestedAssignee', 'suggestedDueDate'],
          additionalProperties: false,
        },
      },
    },
    required: ['summary', 'topics', 'decisions', 'risks', 'actionItems'],
    additionalProperties: false,
  },
} as const;

export function buildAnalysisSystemPrompt(memberNames: string[]): string {
  const membersList =
    memberNames.length > 0 ? memberNames.join(', ') : 'No workspace members listed';

  return `You are an expert meeting analyst. Extract structured insights from meeting transcripts.

Workspace member display names (use for suggestedAssignee matching): ${membersList}

Rules:
- summary: concise paragraph of key outcomes
- topics: short topic labels
- decisions: concrete decisions with brief context
- risks: identified risks with severity (low|medium|high) and context
- actionItems: actionable tasks with title, description, optional suggestedAssignee (exact member name or null), optional suggestedDueDate (YYYY-MM-DD or null)
- Return valid JSON only`;
}
