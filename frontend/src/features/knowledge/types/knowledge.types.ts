export type KnowledgeEntityType =
  | 'PERSON'
  | 'PROJECT'
  | 'DECISION'
  | 'CONCEPT'
  | 'PROCESS'
  | 'OTHER';

export interface KnowledgeEntry {
  id: string;
  workspaceId: string;
  sourceMeetingId: string | null;
  entityType: KnowledgeEntityType;
  title: string;
  content: string;
  confidence: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeListFilters {
  entityType?: KnowledgeEntityType | 'ALL';
  search?: string;
}

export const KNOWLEDGE_ENTITY_TYPE_OPTIONS: { value: KnowledgeEntityType; label: string }[] = [
  { value: 'DECISION', label: 'Decisions' },
  { value: 'PERSON', label: 'People' },
  { value: 'PROJECT', label: 'Projects' },
  { value: 'CONCEPT', label: 'Concepts' },
  { value: 'PROCESS', label: 'Processes' },
  { value: 'OTHER', label: 'Other' },
];
