import { KnowledgeEntityType } from '@prisma/client';

export type KnowledgeEntityKind =
  | 'definition'
  | 'process'
  | 'agreement'
  | 'technical'
  | 'people'
  | 'other';

export interface KnowledgeInput {
  workspaceId: string;
  meetingId: string;
  transcript: string;
  summary: string;
  decisions: Array<{ text: string; context: string }>;
  correlationId?: string;
  jobId?: string;
}

export interface KnowledgeEntryResult {
  entityType: KnowledgeEntityKind;
  title: string;
  content: string;
  confidence: number;
}

export interface KnowledgeOutput {
  entries: KnowledgeEntryResult[];
}

export function toPrismaKnowledgeEntityType(kind: KnowledgeEntityKind): KnowledgeEntityType {
  switch (kind) {
    case 'people':
      return KnowledgeEntityType.PERSON;
    case 'process':
      return KnowledgeEntityType.PROCESS;
    case 'agreement':
      return KnowledgeEntityType.DECISION;
    case 'technical':
    case 'definition':
      return KnowledgeEntityType.CONCEPT;
    default:
      return KnowledgeEntityType.OTHER;
  }
}
