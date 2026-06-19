export interface RiskAnalyzerInput {
  transcript: string;
  summary?: string;
  decisions?: Array<{ text: string; context: string }>;
}

export interface RiskAnalyzerOutput {
  risks: Array<{ text: string; severity: 'low' | 'medium' | 'high'; context: string }>;
}
