export interface TaskExtractorInput {
  transcript: string;
  memberNames: string[];
  summary?: string;
}

export interface TaskExtractorOutput {
  actionItems: Array<{
    title: string;
    description: string;
    suggestedAssignee: string | null;
    suggestedDueDate: string | null;
  }>;
}
