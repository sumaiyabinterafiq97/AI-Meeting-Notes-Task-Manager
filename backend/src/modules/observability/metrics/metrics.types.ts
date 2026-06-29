export interface MetricLabels {
  workspaceId?: string;
  userId?: string;
  model?: string;
  agent?: string;
  agentType?: string;
  provider?: string;
  workflow?: string;
  route?: string;
  method?: string;
  status?: string;
  namespace?: string;
  queue?: string;
  jobType?: string;
}

export interface LatencyMetric {
  name: string;
  valueMs: number;
  labels?: MetricLabels;
  timestamp: string;
}

export interface HistogramSnapshot {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  buckets: Record<string, number>;
}

export interface CounterSnapshot {
  value: number;
  labels: MetricLabels;
}

export interface MetricsSnapshot {
  counters: Record<string, CounterSnapshot[]>;
  histograms: Record<string, HistogramSnapshot>;
  gauges: Record<string, number>;
  collectedAt: string;
}
