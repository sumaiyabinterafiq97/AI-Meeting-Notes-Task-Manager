import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';
import { useWorkspaceMembers } from '../hooks/useWorkspaceMembers';
import { WorkspaceSettingsForm } from '../components/WorkspaceSettingsForm';
import { MemberList } from '../components/MemberList';
import { InviteMemberForm } from '../components/InviteMemberForm';
import { PendingInvitationsList } from '../components/PendingInvitationsList';

export function WorkspaceSettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  const workspaceQuery = useWorkspace(workspaceId);
  const membersQuery = useWorkspaceMembers(workspaceId);

  const currentMember = membersQuery.data?.find((m) => m.userId === user?.id);
  const isOwner = currentMember?.role === 'OWNER';

  if (workspaceQuery.isLoading || membersQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Loading settings" />
      </div>
    );
  }

  if (workspaceQuery.isError) {
    return (
      <ErrorAlert message={getApiErrorMessage(workspaceQuery.error, 'Failed to load workspace')} />
    );
  }

  const workspace = workspaceQuery.data!;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h2>
        <p className="text-muted-foreground">Manage workspace settings and members.</p>
      </div>

      <WorkspaceSettingsForm workspace={workspace} canEdit={isOwner} />

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>People who have access to this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <MemberList workspaceId={workspace.id} isOwner={isOwner} />
        </CardContent>
      </Card>

      {isOwner && (
        <>
          <InviteMemberForm workspaceId={workspace.id} />

          <Card>
            <CardHeader>
              <CardTitle>Pending invitations</CardTitle>
              <CardDescription>Invitations that haven&apos;t been accepted yet.</CardDescription>
            </CardHeader>
            <CardContent>
              <PendingInvitationsList workspaceId={workspace.id} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
