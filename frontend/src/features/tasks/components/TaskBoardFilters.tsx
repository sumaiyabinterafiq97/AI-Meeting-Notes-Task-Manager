import type { WorkspaceMember } from '@/features/workspaces/types/workspace.types';

interface TaskBoardFiltersProps {
  assigneeId: string;
  members: WorkspaceMember[];
  onAssigneeChange: (assigneeId: string) => void;
}

export function TaskBoardFilters({
  assigneeId,
  members,
  onAssigneeChange,
}: TaskBoardFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <select
        aria-label="Filter by assignee"
        value={assigneeId}
        onChange={(event) => onAssigneeChange(event.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:max-w-xs"
      >
        <option value="">All assignees</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}
