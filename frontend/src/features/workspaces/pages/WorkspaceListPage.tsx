import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';
import { getApiErrorMessage } from '@/lib/api-errors';
import { ROUTES } from '@/lib/constants';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { WorkspaceCard } from '../components/WorkspaceCard';
import { CreateWorkspaceDialog } from '../components/CreateWorkspaceDialog';
import { useWorkspaceContext } from '../hooks/useWorkspaceContext';

export function WorkspaceListPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { workspaces, isLoading, isError, error, setActiveWorkspaceId } = useWorkspaceContext();
  const [createOpen, setCreateOpen] = useState(false);

  const handleSelect = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    navigate(ROUTES.CHAT(workspaceId));
  };

  const handleCreated = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    navigate(ROUTES.CHAT(workspaceId));
  };

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-card px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Your workspaces</h1>
            <p className="text-sm text-muted-foreground">
              Select a workspace or create a new one to get started.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4 md:p-8">
        {isLoading && (
          <div className="flex justify-center py-16">
            <LoadingSpinner label="Loading workspaces" />
          </div>
        )}

        {isError && (
          <ErrorAlert
            message={getApiErrorMessage(error, 'Failed to load workspaces')}
            className="mb-6"
          />
        )}

        {!isLoading && !isError && workspaces.length === 0 && (
          <EmptyState
            title="No workspaces yet"
            description="Create your first workspace to organize meetings and tasks with your team."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create workspace
              </Button>
            }
          />
        )}

        {!isLoading && workspaces.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create workspace
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((workspace) => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
