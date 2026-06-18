import { Calendar, CheckCircle2, ClipboardList, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardStats } from '../types/dashboard.types';

interface StatsGridProps {
  stats: DashboardStats;
}

const statConfig = [
  {
    key: 'openTasks' as const,
    label: 'Open Tasks',
    icon: ClipboardList,
    accent: 'text-blue-600',
  },
  {
    key: 'overdueTasks' as const,
    label: 'Overdue Tasks',
    icon: Clock,
    accent: 'text-red-600',
  },
  {
    key: 'totalMeetings' as const,
    label: 'Meetings',
    icon: Calendar,
    accent: 'text-violet-600',
  },
  {
    key: 'completedThisWeek' as const,
    label: 'Completed This Week',
    icon: CheckCircle2,
    accent: 'text-green-600',
  },
];

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statConfig.map(({ key, label, icon: Icon, accent }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            <Icon className={`h-4 w-4 ${accent}`} aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">{stats[key]}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
