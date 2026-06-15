import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your workspace activity and metrics.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {['Open Tasks', 'Overdue Tasks', 'Meetings', 'Completed This Week'].map((stat) => (
          <Card key={stat}>
            <CardHeader className="pb-2">
              <CardDescription>{stat}</CardDescription>
              <CardTitle className="text-4xl">—</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Data will load here</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
