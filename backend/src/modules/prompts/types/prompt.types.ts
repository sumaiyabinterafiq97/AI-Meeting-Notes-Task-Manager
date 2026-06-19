export interface PromptTemplate {
  id: string;
  version: string;
  workflow: string;
  modelHint?: string;
  system: string;
  variables: string[];
  outputSchema?: string;
  fewShotExamples?: Array<{ input: string; output: string }>;
}

export interface PromptRenderContext {
  variables: Record<string, string>;
  workspaceId?: string;
}

export interface RenderedPrompt {
  id: string;
  version: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
}
