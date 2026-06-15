import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const columns = ['To Do', 'In Progress', 'Done'] as const;

export function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
          <p className="text-muted-foreground">Track action items and team workflow.</p>
        </div>
        <Button disabled>New Task</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((column) => (
          <Card key={column}>
            <CardHeader>
              <CardTitle className="text-lg">{column}</CardTitle>
              <CardDescription>Kanban column placeholder</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No tasks</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
