import { formatDate, formatRelativeDate } from '@/lib/utils';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { RoleBadge } from './RoleBadge';
import { useWorkspaceInvitations } from '../hooks/useWorkspaceInvitations';

interface PendingInvitationsListProps {
  workspaceId: string;
}

export function PendingInvitationsList({ workspaceId }: PendingInvitationsListProps) {
  const { data: invitations = [], isLoading, isError, error } = useWorkspaceInvitations(workspaceId);

  if (isLoading) {
    return <LoadingSpinner className="py-6" label="Loading invitations" />;
  }

  if (isError) {
    return <ErrorAlert message={getApiErrorMessage(error, 'Failed to load invitations')} />;
  }

  if (!invitations.length) {
    return <p className="text-sm text-muted-foreground">No pending invitations.</p>;
  }

  return (
    <ul className="divide-y rounded-md border" aria-label="Pending invitations">
      {invitations.map((invitation) => (
        <li key={invitation.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium">{invitation.email}</p>
            <p className="text-sm text-muted-foreground">
              Sent {formatDate(invitation.createdAt)} · {formatRelativeDate(invitation.expiresAt)}
            </p>
          </div>
          <RoleBadge role={invitation.role} />
        </li>
      ))}
    </ul>
  );
}
