import type { MetricsSnapshot, MetricLabels } from './metrics.types';
import { metricsStore } from './metrics-store';

export function buildMetricsSnapshot(): MetricsSnapshot {
  const counters: MetricsSnapshot['counters'] = {};
  const histograms: MetricsSnapshot['histograms'] = {};
  const gauges: MetricsSnapshot['gauges'] = {};

  for (const [key, value] of metricsStore.getAllCounters()) {
    const [name, labelStr] = key.split('|');
    const labels = parseLabelString(labelStr);
    counters[name] ??= [];
    counters[name].push({ value, labels });
  }

  for (const [key, value] of metricsStore.getAllGauges()) {
    const [name] = key.split('|');
    gauges[name] = value;
  }

  const seenHistograms = new Set<string>();
  for (const key of metricsStore.getAllCounters().keys()) {
    const [name] = key.split('|');
    seenHistograms.add(name);
  }

  for (const name of [
    'latency.duration',
    'llm.embedding.duration',
    'rag.retrieval.duration',
    'agent.execution.duration',
    'orchestrator.graph.duration',
  ]) {
    histograms[name] = metricsStore.getHistogramSnapshot(name);
  }

  return { counters, histograms, gauges, collectedAt: new Date().toISOString() };
}

export function exportPrometheusText(): string {
  const lines: string[] = [];
  const snapshot = buildMetricsSnapshot();

  for (const [name, entries] of Object.entries(snapshot.counters)) {
    const promName = name.replace(/\./g, '_');
    for (const entry of entries) {
      const labelStr = formatPromLabels(entry.labels);
      lines.push(`${promName}${labelStr} ${entry.value}`);
    }
  }

  for (const [name, hist] of Object.entries(snapshot.histograms)) {
    if (hist.count === 0) continue;
    const promName = name.replace(/\./g, '_');
    lines.push(`${promName}_count ${hist.count}`);
    lines.push(`${promName}_sum ${hist.sum}`);
    lines.push(`${promName}_p95 ${hist.p95}`);
    lines.push(`${promName}_p99 ${hist.p99}`);
  }

  return lines.join('\n');
}

function parseLabelString(labelStr: string): Record<string, string> {
  if (labelStr === '__default__') return {};
  return Object.fromEntries(
    labelStr.split(',').map((pair) => {
      const [key, value] = pair.split('=');
      return [key, value];
    }),
  );
}

function formatPromLabels(labels: MetricLabels): string {
  const pairs = Object.entries(labels).filter(([, v]) => v !== undefined) as [string, string][];
  if (pairs.length === 0) return '';
  return `{${pairs.map(([k, v]) => `${k}="${v}"`).join(',')}}`;
}
