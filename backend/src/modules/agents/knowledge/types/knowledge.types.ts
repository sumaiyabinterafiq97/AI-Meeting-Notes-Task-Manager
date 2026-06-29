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
  meetingTitle?: string;
  correlationId?: string;
  jobId?: string;
}

export interface KnowledgeSourceRef {
  meetingId: string;
  excerpt: string;
  timestamp?: string | null;
}

export interface KnowledgeEntryResult {
  entityType: KnowledgeEntityKind;
  title: string;
  content: string;
  confidence: number;
  sourceRef?: KnowledgeSourceRef;
}

/** Canonical knowledge output — v2.0 fields plus optional v2.1 sourceRef. */
export interface KnowledgeOutput {
  entries: KnowledgeEntryResult[];
  filteredCount?: number;
  averageConfidence?: number;
}

export interface KnowledgeValidationResult {
  valid: boolean;
  warnings: string[];
  weakEntryTitles: string[];
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
