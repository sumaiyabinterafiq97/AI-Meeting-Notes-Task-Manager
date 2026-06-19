export const SUMMARIZER_OUTPUT_SCHEMA = {
  name: 'summarizer_output',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      keyTopics: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['summary', 'keyTopics'],
    additionalProperties: false,
  },
} as const;

export const TASK_EXTRACTOR_OUTPUT_SCHEMA = {
  name: 'task_extractor_output',
  strict: true,
  schema: {
    type: 'object',
    properties: {
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
    required: ['actionItems'],
    additionalProperties: false,
  },
} as const;

export const DECISION_OUTPUT_SCHEMA = {
  name: 'decision_output',
  strict: true,
  schema: {
    type: 'object',
    properties: {
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
    },
    required: ['decisions'],
    additionalProperties: false,
  },
} as const;

export const RISK_ANALYZER_OUTPUT_SCHEMA = {
  name: 'risk_analyzer_output',
  strict: true,
  schema: {
    type: 'object',
    properties: {
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
    },
    required: ['risks'],
    additionalProperties: false,
  },
} as const;

export const KNOWLEDGE_OUTPUT_SCHEMA = {
  name: 'knowledge_output',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      entries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            entityType: {
              type: 'string',
              enum: ['definition', 'process', 'agreement', 'technical', 'people', 'other'],
            },
            title: { type: 'string' },
            content: { type: 'string' },
            confidence: { type: 'number' },
          },
          required: ['entityType', 'title', 'content', 'confidence'],
          additionalProperties: false,
        },
      },
    },
    required: ['entries'],
    additionalProperties: false,
  },
} as const;

export const WEEKLY_REPORT_OUTPUT_SCHEMA = {
  name: 'weekly_report_output',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            heading: { type: 'string' },
            content: { type: 'string' },
            meetingIds: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['heading', 'content'],
          additionalProperties: false,
        },
      },
      taskStats: {
        type: 'object',
        additionalProperties: { type: 'number' },
      },
      meetingCount: { type: 'number' },
    },
    required: ['title', 'sections', 'taskStats', 'meetingCount'],
    additionalProperties: false,
  },
} as const;
