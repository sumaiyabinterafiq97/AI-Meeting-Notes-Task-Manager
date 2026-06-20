/** OpenAI-compatible JSON schemas for v2.1 structured outputs. */

export const SUMMARIZER_OUTPUT_SCHEMA_V21 = {
  name: 'summarizer_output_v21',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      keyTopics: { type: 'array', items: { type: 'string' } },
      nextSteps: { type: 'array', items: { type: 'string' } },
      participantsDiscussed: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary', 'keyTopics'],
    additionalProperties: false,
  },
} as const;

export const TASK_EXTRACTOR_OUTPUT_SCHEMA_V21 = {
  name: 'task_extractor_output_v21',
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
            priority: {
              type: ['string', 'null'],
              enum: ['low', 'medium', 'high', 'critical', null],
            },
            dependencies: { type: 'array', items: { type: 'string' } },
            confidenceScore: { type: 'number' },
          },
          required: [
            'title',
            'description',
            'suggestedAssignee',
            'suggestedDueDate',
            'priority',
            'dependencies',
            'confidenceScore',
          ],
          additionalProperties: false,
        },
      },
    },
    required: ['actionItems'],
    additionalProperties: false,
  },
} as const;

export const DECISION_OUTPUT_SCHEMA_V21 = {
  name: 'decision_output_v21',
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
            stakeholders: { type: 'array', items: { type: 'string' } },
            confidenceScore: { type: 'number' },
            supportingEvidence: { type: 'string' },
          },
          required: ['text', 'context', 'stakeholders', 'confidenceScore', 'supportingEvidence'],
          additionalProperties: false,
        },
      },
    },
    required: ['decisions'],
    additionalProperties: false,
  },
} as const;

export const RISK_ANALYZER_OUTPUT_SCHEMA_V21 = {
  name: 'risk_analyzer_output_v21',
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
            impact: { type: 'string' },
            likelihood: { type: 'string', enum: ['low', 'medium', 'high', 'unknown'] },
            recommendation: { type: 'string' },
            evidence: { type: 'string' },
            confidenceScore: { type: 'number' },
          },
          required: [
            'text',
            'severity',
            'context',
            'impact',
            'likelihood',
            'recommendation',
            'evidence',
            'confidenceScore',
          ],
          additionalProperties: false,
        },
      },
    },
    required: ['risks'],
    additionalProperties: false,
  },
} as const;

export const WEEKLY_REPORT_OUTPUT_SCHEMA_V21 = {
  name: 'weekly_report_output_v21',
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
            meetingIds: { type: 'array', items: { type: 'string' } },
            citations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  index: { type: 'integer' },
                  chunkId: { type: 'string' },
                  meetingId: { type: 'string' },
                },
                required: ['index'],
                additionalProperties: false,
              },
            },
          },
          required: ['heading', 'content'],
          additionalProperties: false,
        },
      },
      taskStats: { type: 'object', additionalProperties: { type: 'number' } },
      meetingCount: { type: 'number' },
    },
    required: ['title', 'sections', 'taskStats', 'meetingCount'],
    additionalProperties: false,
  },
} as const;

export const KNOWLEDGE_OUTPUT_SCHEMA_V21 = {
  name: 'knowledge_output_v21',
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
            sourceRef: {
              type: 'object',
              properties: {
                meetingId: { type: 'string' },
                excerpt: { type: 'string' },
                timestamp: { type: ['string', 'null'] },
              },
              required: ['meetingId', 'excerpt'],
              additionalProperties: false,
            },
          },
          required: ['entityType', 'title', 'content', 'confidence', 'sourceRef'],
          additionalProperties: false,
        },
      },
    },
    required: ['entries'],
    additionalProperties: false,
  },
} as const;

export const CHAT_RESPONSE_OUTPUT_SCHEMA_V21 = {
  name: 'chat_response_output_v21',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      content: { type: 'string' },
      citations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            index: { type: 'integer' },
            chunkId: { type: 'string' },
            meetingId: { type: 'string' },
            excerpt: { type: 'string' },
            claimText: { type: 'string' },
          },
          required: ['index', 'chunkId'],
          additionalProperties: false,
        },
      },
      grounded: { type: 'boolean' },
      refusalReason: { type: ['string', 'null'] },
    },
    required: ['content', 'citations', 'grounded', 'refusalReason'],
    additionalProperties: false,
  },
} as const;
