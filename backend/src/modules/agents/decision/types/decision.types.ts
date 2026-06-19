export interface DecisionInput {
  transcript: string;
  summary?: string;
  memberNames: string[];
}

export interface DecisionOutput {
  decisions: Array<{ text: string; context: string }>;
}
