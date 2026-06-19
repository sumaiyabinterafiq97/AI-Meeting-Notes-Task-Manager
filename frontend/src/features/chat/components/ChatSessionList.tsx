import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { ROUTES } from '@/lib/constants';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useChatSessions } from '../hooks/useChatSessions';
import { useClearChatSession } from '../hooks/useClearChatSession';
import { ChatSessionItem } from './ChatSessionItem';

interface ChatSessionListProps {
  workspaceId: string;
  activeSessionId?: string;
  onNavigate?: () => void;
}

export function ChatSessionList({
  workspaceId,
  activeSessionId,
  onNavigate,
}: ChatSessionListProps) {
  const navigate = useNavigate();
  const { data: sessions = [], isLoading, isError, error } = useChatSessions(workspaceId);
  const clearSession = useClearChatSession(workspaceId);

  const handleDelete = async (sessionId: string) => {
    await clearSession.mutateAsync(sessionId);
    if (sessionId === activeSessionId) {
      navigate(ROUTES.CHAT(workspaceId));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Button variant="outline" className="w-full justify-start gap-2" asChild>
        <Link to={ROUTES.CHAT(workspaceId)} onClick={onNavigate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New chat
        </Link>
      </Button>

      {isLoading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner label="Loading chats" />
        </div>
      )}

      {isError && (
        <ErrorAlert message={getApiErrorMessage(error, 'Failed to load chat sessions')} />
      )}

      {!isLoading && !isError && sessions.length === 0 && (
        <p className="px-1 text-sm text-muted-foreground">No workspace chats yet.</p>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto" aria-label="Chat sessions">
        {sessions.map((session) => (
          <ChatSessionItem
            key={session.id}
            workspaceId={workspaceId}
            session={session}
            isActive={session.id === activeSessionId}
            onDelete={handleDelete}
            isDeleting={clearSession.isPending && clearSession.variables === session.id}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}
