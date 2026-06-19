import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { ChatSession } from '../types/chat.types';

interface ChatSessionItemProps {
  workspaceId: string;
  session: ChatSession;
  isActive: boolean;
  onDelete?: (sessionId: string) => void;
  isDeleting?: boolean;
  onNavigate?: () => void;
}

function sessionLabel(session: ChatSession): string {
  if (session.title?.trim()) {
    return session.title.trim();
  }

  return `Chat ${formatDateTime(session.createdAt)}`;
}

export function ChatSessionItem({
  workspaceId,
  session,
  isActive,
  onDelete,
  isDeleting = false,
  onNavigate,
}: ChatSessionItemProps) {
  return (
    <div
      className={cn(
        'group flex items-start gap-2 rounded-md border px-3 py-2 transition-colors',
        isActive ? 'border-primary/40 bg-accent' : 'border-transparent hover:bg-muted/60',
      )}
    >
      <Link
        to={ROUTES.CHAT_SESSION(workspaceId, session.id)}
        onClick={onNavigate}
        className="min-w-0 flex-1"
        aria-current={isActive ? 'page' : undefined}
      >
        <p className="truncate text-sm font-medium">{sessionLabel(session)}</p>
        <time className="text-xs text-muted-foreground" dateTime={session.updatedAt}>
          {formatDateTime(session.updatedAt)}
        </time>
      </Link>
      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          onClick={() => onDelete(session.id)}
          disabled={isDeleting}
          aria-label={`Delete ${sessionLabel(session)}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
