import { useParams } from 'react-router-dom';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { ChatSidebar } from '../components/ChatSidebar';
import { WorkspaceChatPanel } from '../components/WorkspaceChatPanel';

export function ChatPage() {
  const { workspaceId, sessionId } = useParams<{ workspaceId: string; sessionId?: string }>();

  if (!workspaceId) {
    return <ErrorAlert message="Workspace not found" />;
  }

  return (
    <div className="-m-4 flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom,0px))] flex-col overflow-hidden xl:-m-6 xl:h-[calc(100dvh-3.5rem)]">
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border bg-background">
        <ChatSidebar workspaceId={workspaceId} activeSessionId={sessionId} />
        <WorkspaceChatPanel workspaceId={workspaceId} sessionId={sessionId} />
      </div>
    </div>
  );
}
