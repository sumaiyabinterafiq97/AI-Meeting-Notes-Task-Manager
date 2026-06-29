export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TaskExtractorInput {
  transcript: string;
  memberNames: string[];
  summary?: string;
  meetingDate?: string;
}

export interface ActionItem {
  title: string;
  description: string;
  suggestedAssignee: string | null;
  suggestedDueDate: string | null;
  priority?: TaskPriority | null;
  dependencies?: string[];
  confidenceScore?: number;
  supportingEvidence?: string;
}

export interface TaskExtractorOutput {
  actionItems: ActionItem[];
  filteredCount?: number;
  averageConfidence?: number;
}

export interface TaskExtractorValidationResult {
  valid: boolean;
  warnings: string[];
  invalidAssignees: string[];
}
