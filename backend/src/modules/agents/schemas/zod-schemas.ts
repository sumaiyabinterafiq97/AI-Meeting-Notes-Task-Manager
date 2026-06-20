import { z } from 'zod';

const confidenceScore = z.number().min(0).max(1);
const isoDateOrNull = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']).nullable();

export const ActionItemSchemaV20 = z.object({
  title: z.string().max(300),
  description: z.string().max(1000),
  suggestedAssignee: z.string().nullable(),
  suggestedDueDate: isoDateOrNull,
});

export const ActionItemSchemaV21 = ActionItemSchemaV20.extend({
  priority: TaskPrioritySchema,
  dependencies: z.array(z.string().max(200)).max(5),
  confidenceScore,
});

export const SummarizerOutputSchemaV20 = z.object({
  summary: z.string().max(4000),
  keyTopics: z.array(z.string().max(120)).max(8),
});

export const SummarizerOutputSchemaV21 = SummarizerOutputSchemaV20.extend({
  nextSteps: z.array(z.string().max(300)).max(5).optional(),
  participantsDiscussed: z.array(z.string()).optional(),
});

export const TaskExtractorOutputSchemaV20 = z.object({
  actionItems: z.array(ActionItemSchemaV20).max(20),
});

export const TaskExtractorOutputSchemaV21 = z.object({
  actionItems: z.array(ActionItemSchemaV21).max(20),
});

export const DecisionItemSchemaV20 = z.object({
  text: z.string().max(500),
  context: z.string().max(1000),
});

export const DecisionItemSchemaV21 = DecisionItemSchemaV20.extend({
  stakeholders: z.array(z.string()).max(10),
  confidenceScore,
  supportingEvidence: z.string().max(500),
});

export const DecisionOutputSchemaV20 = z.object({
  decisions: z.array(DecisionItemSchemaV20).max(15),
});

export const DecisionOutputSchemaV21 = z.object({
  decisions: z.array(DecisionItemSchemaV21).max(15),
});

export const RiskSeveritySchema = z.enum(['low', 'medium', 'high']);
export const RiskLikelihoodSchema = z.enum(['low', 'medium', 'high', 'unknown']);

export const RiskItemSchemaV20 = z.object({
  text: z.string().max(500),
  severity: RiskSeveritySchema,
  context: z.string().max(1000),
});

export const RiskItemSchemaV21 = RiskItemSchemaV20.extend({
  impact: z.string().max(500),
  likelihood: RiskLikelihoodSchema,
  recommendation: z.string().max(500),
  evidence: z.string().max(500),
  confidenceScore,
});

export const RiskAnalyzerOutputSchemaV20 = z.object({
  risks: z.array(RiskItemSchemaV20).max(10),
});

export const RiskAnalyzerOutputSchemaV21 = z.object({
  risks: z.array(RiskItemSchemaV21).max(10),
});

export const WeeklyReportSectionSchemaV20 = z.object({
  heading: z.string(),
  content: z.string(),
  meetingIds: z.array(z.string()).optional(),
});

export const WeeklyReportCitationSchema = z.object({
  index: z.number().int(),
  chunkId: z.string().optional(),
  meetingId: z.string().optional(),
});

export const WeeklyReportSectionSchemaV21 = WeeklyReportSectionSchemaV20.extend({
  citations: z.array(WeeklyReportCitationSchema).optional(),
});

export const WeeklyReportOutputSchemaV20 = z.object({
  title: z.string(),
  sections: z.array(WeeklyReportSectionSchemaV20),
  taskStats: z.record(z.string(), z.number()),
  meetingCount: z.number(),
});

export const WeeklyReportOutputSchemaV21 = z.object({
  title: z.string(),
  sections: z.array(WeeklyReportSectionSchemaV21),
  taskStats: z.record(z.string(), z.number()),
  meetingCount: z.number(),
});

export const KnowledgeEntrySchemaV20 = z.object({
  entityType: z.enum(['definition', 'process', 'agreement', 'technical', 'people', 'other']),
  title: z.string(),
  content: z.string(),
  confidence: z.number().min(0.5).max(1),
});

export const KnowledgeSourceRefSchema = z.object({
  meetingId: z.string(),
  excerpt: z.string().max(300),
  timestamp: z.string().nullable().optional(),
});

export const KnowledgeEntrySchemaV21 = KnowledgeEntrySchemaV20.extend({
  sourceRef: KnowledgeSourceRefSchema,
});

export const KnowledgeOutputSchemaV20 = z.object({
  entries: z.array(KnowledgeEntrySchemaV20),
});

export const KnowledgeOutputSchemaV21 = z.object({
  entries: z.array(KnowledgeEntrySchemaV21),
});

export const ChatCitationSchema = z.object({
  index: z.number().int(),
  chunkId: z.string(),
  meetingId: z.string().optional(),
  excerpt: z.string().optional(),
  claimText: z.string().optional(),
});

export const ChatResponseSchema = z.object({
  content: z.string(),
  citations: z.array(ChatCitationSchema).optional(),
  grounded: z.boolean().optional(),
  refusalReason: z.string().nullable().optional(),
});

export type SummarizerOutputV20 = z.infer<typeof SummarizerOutputSchemaV20>;
export type SummarizerOutputV21 = z.infer<typeof SummarizerOutputSchemaV21>;
export type TaskExtractorOutputV20 = z.infer<typeof TaskExtractorOutputSchemaV20>;
export type TaskExtractorOutputV21 = z.infer<typeof TaskExtractorOutputSchemaV21>;
export type DecisionOutputV20 = z.infer<typeof DecisionOutputSchemaV20>;
export type DecisionOutputV21 = z.infer<typeof DecisionOutputSchemaV21>;
export type RiskAnalyzerOutputV20 = z.infer<typeof RiskAnalyzerOutputSchemaV20>;
export type RiskAnalyzerOutputV21 = z.infer<typeof RiskAnalyzerOutputSchemaV21>;
export type WeeklyReportOutputV20 = z.infer<typeof WeeklyReportOutputSchemaV20>;
export type WeeklyReportOutputV21 = z.infer<typeof WeeklyReportOutputSchemaV21>;
export type KnowledgeOutputV20 = z.infer<typeof KnowledgeOutputSchemaV20>;
export type KnowledgeOutputV21 = z.infer<typeof KnowledgeOutputSchemaV21>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
