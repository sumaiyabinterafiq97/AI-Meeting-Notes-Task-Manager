export interface MetricLabels {
  workflow?: string;
  provider?: string;
  agentType?: string;
  workspaceId?: string;
}

export interface LatencyMetric {
  name: string;
  valueMs: number;
  labels?: MetricLabels;
  timestamp: string;
}
