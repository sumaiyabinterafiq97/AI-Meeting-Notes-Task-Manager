import { LATENCY_BUCKETS_MS } from './metrics.constants';
import type { HistogramSnapshot, MetricLabels } from './metrics.types';

function labelKey(labels?: MetricLabels): string {
  if (!labels || Object.keys(labels).length === 0) return '__default__';
  return Object.entries(labels)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))] ?? 0;
}

interface HistogramState {
  values: number[];
  buckets: Record<string, number>;
  sum: number;
}

export class MetricsStore {
  private counters = new Map<string, number>();
  private histograms = new Map<string, HistogramState>();
  private gauges = new Map<string, number>();

  incrementCounter(name: string, labels?: MetricLabels, delta = 1): void {
    const key = `${name}|${labelKey(labels)}`;
    this.counters.set(key, (this.counters.get(key) ?? 0) + delta);
  }

  recordHistogram(name: string, valueMs: number, labels?: MetricLabels): void {
    const key = `${name}|${labelKey(labels)}`;
    const state = this.histograms.get(key) ?? {
      values: [],
      buckets: Object.fromEntries(LATENCY_BUCKETS_MS.map((b) => [`le_${b}`, 0])),
      sum: 0,
    };

    state.values.push(valueMs);
    state.sum += valueMs;

    for (const bucket of LATENCY_BUCKETS_MS) {
      if (valueMs <= bucket) {
        state.buckets[`le_${bucket}`] = (state.buckets[`le_${bucket}`] ?? 0) + 1;
      }
    }

    this.histograms.set(key, state);
  }

  setGauge(name: string, value: number, labels?: MetricLabels): void {
    const key = `${name}|${labelKey(labels)}`;
    this.gauges.set(key, value);
  }

  getHistogramSnapshot(name: string, labels?: MetricLabels): HistogramSnapshot {
    const key = `${name}|${labelKey(labels)}`;
    const state = this.histograms.get(key);
    if (!state || state.values.length === 0) {
      return {
        count: 0,
        sum: 0,
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        buckets: {},
      };
    }

    const sorted = [...state.values].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      count,
      sum: state.sum,
      avg: state.sum / count,
      min: sorted[0] ?? 0,
      max: sorted[count - 1] ?? 0,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      buckets: { ...state.buckets },
    };
  }

  getCounter(name: string, labels?: MetricLabels): number {
    return this.counters.get(`${name}|${labelKey(labels)}`) ?? 0;
  }

  getAllCounters(): Map<string, number> {
    return new Map(this.counters);
  }

  getAllGauges(): Map<string, number> {
    return new Map(this.gauges);
  }

  reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }
}

export const metricsStore = new MetricsStore();
