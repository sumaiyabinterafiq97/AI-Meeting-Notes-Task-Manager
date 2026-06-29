export interface EvalCase {
  id: string;
  name: string;
  tags?: string[];
  input: Record<string, unknown>;
  expect: Record<string, unknown>;
  scoring?: {
    weight?: number;
    modes?: string[];
    pass_threshold?: number;
  };
}

export interface EvalFixtureFile {
  version: string;
  agent: string;
  prompt_version?: string;
  schema_version?: string;
  schema?: string;
  output_format?: string;
  cases: EvalCase[];
  v21_cases?: EvalCase[];
}

export interface SuiteManifestEntry {
  file: string;
  agent: string;
  alias?: string;
  case_count: number;
}

export interface EvalManifest {
  version: string;
  defaults: {
    prompt_version: string;
    schema_version: string;
    consistency_threshold: number;
    scoring: { modes: string[]; pass_threshold: number };
  };
  quality_gates: {
    schema_validity_min: number;
    hallucination_rate_max: number;
  };
  suites: Record<string, SuiteManifestEntry>;
}

export interface EvalCliOptions {
  suite: string;
  fixturesPath?: string;
  promptVersion?: string;
  schemaVersion: '2.0' | '2.1';
  model?: string;
  mock: boolean;
  runs: number;
  caseId?: string;
  includeV21: boolean;
  outputPath?: string;
  failFast: boolean;
  strict: boolean;
}

export interface CaseResult {
  id: string;
  name: string;
  suite: string;
  passed: boolean;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  scorers: Record<string, boolean>;
  errors: string[];
  tags: string[];
}

export interface EvalReport {
  runId: string;
  timestamp: string;
  prompt_version: string;
  schema_version: string;
  model: string;
  mock: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    pass_rate: number;
    avg_latency_ms: number;
    total_tokens: number;
  };
  quality_gates: Record<string, { value: number; pass: boolean }>;
  cases: CaseResult[];
}
