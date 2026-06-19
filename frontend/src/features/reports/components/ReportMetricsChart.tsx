import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from './ChartCard';

interface ReportMetricsChartProps {
  taskStats: Record<string, number>;
  meetingCount: number;
}

export function ReportMetricsChart({ taskStats, meetingCount }: ReportMetricsChartProps) {
  const chartData = [
    { name: 'Created', value: taskStats.created ?? 0 },
    { name: 'Completed', value: taskStats.completed ?? 0 },
    { name: 'Open', value: taskStats.open ?? 0 },
  ];

  const summary = chartData.map((item) => `${item.name} ${item.value}`).join(', ');

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard
        title="Task throughput"
        description={`${meetingCount} meeting${meetingCount === 1 ? '' : 's'} in this period`}
        ariaLabel={`Task throughput chart: ${summary}`}
      >
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="Meetings covered"
        description="Meetings included in this report period"
        ariaLabel={`Meetings covered: ${meetingCount}`}
      >
        <div className="flex h-56 items-center justify-center">
          <p className="text-5xl font-bold tracking-tight">{meetingCount}</p>
        </div>
      </ChartCard>
    </div>
  );
}
