export interface SummarizerInput {
  transcript: string;
  meetingTitle: string;
  memberNames: string[];
  meetingDate: string;
}

export interface SummarizerOutput {
  summary: string;
  keyTopics: string[];
}
