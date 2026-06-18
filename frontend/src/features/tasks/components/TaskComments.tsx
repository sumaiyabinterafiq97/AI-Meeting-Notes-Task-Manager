import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { formatDateTime } from '@/lib/utils';
import { useTaskComments } from '../hooks/useTaskComments';
import { CommentForm } from './CommentForm';

interface TaskCommentsProps {
  workspaceId: string;
  taskId: string;
}

export function TaskComments({ workspaceId, taskId }: TaskCommentsProps) {
  const { data: comments = [], isLoading, isError, error } = useTaskComments(workspaceId, taskId);

  return (
    <div className="space-y-4">
      <CommentForm workspaceId={workspaceId} taskId={taskId} />

      {isLoading && (
        <div className="flex justify-center py-4">
          <LoadingSpinner label="Loading comments" />
        </div>
      )}

      {isError && (
        <ErrorAlert message={getApiErrorMessage(error, 'Failed to load comments')} />
      )}

      {!isLoading && !isError && comments.length === 0 && (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      )}

      {!isLoading && comments.length > 0 && (
        <ul className="space-y-3" aria-label="Task comments">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{comment.author.displayName}</span>
                <time className="text-xs text-muted-foreground" dateTime={comment.createdAt}>
                  {formatDateTime(comment.createdAt)}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {comment.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
