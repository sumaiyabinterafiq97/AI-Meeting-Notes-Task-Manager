import { useAuth } from '@/features/auth/hooks/useAuth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { Button } from '@/components/ui/button';
import { RoleBadge } from './RoleBadge';
import { useWorkspaceMembers } from '../hooks/useWorkspaceMembers';
import { useUpdateMemberRole } from '../hooks/useUpdateMemberRole';
import { useRemoveMember } from '../hooks/useRemoveMember';
import type { WorkspaceRole } from '../types/workspace.types';

interface MemberListProps {
  workspaceId: string;
  isOwner: boolean;
}

export function MemberList({ workspaceId, isOwner }: MemberListProps) {
  const { user } = useAuth();
  const { data: members = [], isLoading, isError, error } = useWorkspaceMembers(workspaceId);
  const updateRoleMutation = useUpdateMemberRole(workspaceId);
  const removeMemberMutation = useRemoveMember(workspaceId);

  if (isLoading) {
    return <LoadingSpinner className="py-6" label="Loading members" />;
  }

  if (isError) {
    return <ErrorAlert message={getApiErrorMessage(error, 'Failed to load members')} />;
  }

  const handleRoleChange = (userId: string, role: WorkspaceRole) => {
    void updateRoleMutation.mutateAsync({ userId, role });
  };

  const handleRemove = (userId: string, displayName: string) => {
    if (window.confirm(`Remove ${displayName} from this workspace?`)) {
      void removeMemberMutation.mutateAsync(userId);
    }
  };

  return (
    <ul className="divide-y rounded-md border" aria-label="Workspace members">
      {members.map((member) => {
        const isSelf = member.userId === user?.id;
        const canManage = isOwner && !isSelf;

        return (
          <li
            key={member.userId}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {member.displayName}
                {isSelf && (
                  <span className="ml-2 text-sm text-muted-foreground">(you)</span>
                )}
              </p>
              <p className="truncate text-sm text-muted-foreground">{member.email}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canManage ? (
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.userId, e.target.value as WorkspaceRole)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  aria-label={`Change role for ${member.displayName}`}
                  disabled={updateRoleMutation.isPending}
                >
                  <option value="MEMBER">Member</option>
                  <option value="OWNER">Owner</option>
                </select>
              ) : (
                <RoleBadge role={member.role} />
              )}

              {canManage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemove(member.userId, member.displayName)}
                  disabled={removeMemberMutation.isPending}
                >
                  Remove
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
