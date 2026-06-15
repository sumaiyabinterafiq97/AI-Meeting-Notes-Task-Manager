import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';

export function WorkspacePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Your Workspaces</CardTitle>
          <CardDescription>Select or create a workspace to get started.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">No workspaces yet.</p>
          <div className="flex gap-2">
            <Button disabled>Create Workspace</Button>
            <Button variant="outline" asChild>
              <Link to={ROUTES.DASHBOARD('demo')}>Demo Workspace</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
