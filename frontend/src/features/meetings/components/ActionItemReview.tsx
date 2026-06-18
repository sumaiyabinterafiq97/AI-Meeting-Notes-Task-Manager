import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { formatDate } from '@/lib/utils';
import { useWorkspaceMembers } from '@/features/workspaces/hooks/useWorkspaceMembers';
import { ActionItemStatusBadge } from './ActionItemStatusBadge';
import { useAcceptActionItems } from '../hooks/useAcceptActionItems';
import { useRejectActionItems } from '../hooks/useRejectActionItems';
import type { ActionItem } from '../types/meeting.types';

interface ActionItemReviewProps {
  workspaceId: string;
  meetingId: string;
  actionItems: ActionItem[];
}

export function ActionItemReview({ workspaceId, meetingId, actionItems }: ActionItemReviewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const acceptMutation = useAcceptActionItems(workspaceId, meetingId);
  const rejectMutation = useRejectActionItems(workspaceId, meetingId);

  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.userId, member.displayName])),
    [members],
  );

  const pendingItems = actionItems.filter((item) => item.status === 'PENDING');
  const isBusy = acceptMutation.isPending || rejectMutation.isPending;

  const toggleItem = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllPending = () => {
    if (selectedIds.size === pendingItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingItems.map((item) => item.id)));
    }
  };

  const handleAccept = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    await acceptMutation.mutateAsync(ids);
    setSelectedIds(new Set());
  };

  const handleReject = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    await rejectMutation.mutateAsync(ids);
    setSelectedIds(new Set());
  };

  if (actionItems.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No action items were extracted from this meeting.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {(acceptMutation.isError || rejectMutation.isError) && (
        <ErrorAlert
          message={getApiErrorMessage(
            acceptMutation.error ?? rejectMutation.error,
            'Failed to update action items',
          )}
        />
      )}

      {pendingItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b pb-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleAllPending}
            disabled={isBusy}
          >
            {selectedIds.size === pendingItems.length ? 'Deselect all' : 'Select all pending'}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleAccept()}
            disabled={isBusy || selectedIds.size === 0}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Accept selected ({selectedIds.size})
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleReject()}
            disabled={isBusy || selectedIds.size === 0}
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Reject selected
          </Button>
        </div>
      )}

      <ul className="space-y-3" aria-label="Action items">
        {actionItems.map((item) => {
          const assigneeName = item.suggestedAssigneeId
            ? memberNames.get(item.suggestedAssigneeId)
            : null;

          return (
            <li
              key={item.id}
              className="flex gap-3 rounded-lg border p-4"
              data-status={item.status}
            >
              {item.status === 'PENDING' && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleItem(item.id)}
                  disabled={isBusy}
                  aria-label={`Select ${item.title}`}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-input"
                />
              )}

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-medium leading-snug">{item.title}</h4>
                  <ActionItemStatusBadge status={item.status} />
                </div>

                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {assigneeName && <span>Suggested: {assigneeName}</span>}
                  {item.suggestedDueDate && (
                    <span>Due: {formatDate(item.suggestedDueDate)}</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
