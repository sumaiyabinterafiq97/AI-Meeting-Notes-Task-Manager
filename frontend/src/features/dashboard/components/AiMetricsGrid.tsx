import { Sparkles, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardAiMetrics } from '../types/dashboard.types';

interface AiMetricsGridProps {
  metrics: DashboardAiMetrics;
}

const metricConfig = [
  {
    key: 'summariesGenerated' as const,
    label: 'AI Summaries',
    icon: Sparkles,
    accent: 'text-violet-600',
    description: 'Meetings with generated summaries',
  },
  {
    key: 'pendingActionItems' as const,
    label: 'Pending Reviews',
    icon: ClipboardCheck,
    accent: 'text-amber-600',
    description: 'Action items awaiting acceptance',
  },
  {
    key: 'failedProcessing' as const,
    label: 'Processing Failures',
    icon: AlertTriangle,
    accent: 'text-red-600',
    description: 'Meetings that need transcript retry',
  },
];

export function AiMetricsGrid({ metrics }: AiMetricsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {metricConfig.map(({ key, label, icon: Icon, accent, description }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            <Icon className={`h-4 w-4 ${accent}`} aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">{metrics[key]}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
