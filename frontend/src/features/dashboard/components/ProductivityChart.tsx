import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatIsoWeek } from '../lib/activity';
import type { WeeklyCompletion } from '../types/dashboard.types';

interface ProductivityChartProps {
  weeks: WeeklyCompletion[];
  avgDaysToComplete: number | null;
}

export function ProductivityChart({ weeks, avgDaysToComplete }: ProductivityChartProps) {
  const maxCount = Math.max(...weeks.map((week) => week.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Productivity</CardTitle>
        <CardDescription>
          Tasks completed per week
          {avgDaysToComplete !== null && ` · Avg ${avgDaysToComplete} days to complete`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="flex h-40 items-end gap-2"
          role="img"
          aria-label="Weekly task completion chart"
        >
          {weeks.map((week) => (
            <div key={week.week} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-28 w-full items-end justify-center">
                <div
                  className="w-full max-w-10 rounded-t-md bg-primary/80 transition-all"
                  style={{ height: `${(week.count / maxCount) * 100}%`, minHeight: week.count > 0 ? '4px' : '0' }}
                  title={`${week.count} tasks`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{formatIsoWeek(week.week)}</span>
              <span className="text-xs font-medium">{week.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
