import type { MetricLabels } from '../metrics/metrics.types';

export type LatencyCategory =
  | 'embedding'
  | 'retrieval'
  | 'prompt'
  | 'agent'
  | 'chat'
  | 'queue'
  | 'database'
  | 'graph'
  | 'e2e';

export interface LatencyRecord {
  category: LatencyCategory;
  name: string;
  valueMs: number;
  labels?: MetricLabels;
  timestamp: string;
  slow: boolean;
}

export interface LatencySummary {
  name: string;
  count: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  slowCount: number;
}
