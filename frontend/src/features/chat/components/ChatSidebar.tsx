import { useState } from 'react';
import { PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SlideOver } from '@/components/common/SlideOver';
import { ChatSessionList } from './ChatSessionList';

interface ChatSidebarProps {
  workspaceId: string;
  activeSessionId?: string;
}

export function ChatSidebar({ workspaceId, activeSessionId }: ChatSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="hidden h-full min-h-0 w-72 shrink-0 border-r bg-card p-4 xl:block">
        <ChatSessionList workspaceId={workspaceId} activeSessionId={activeSessionId} />
      </div>

      <div className="border-b p-3 xl:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setMobileOpen(true)}
          aria-expanded={mobileOpen}
        >
          <PanelLeft className="h-4 w-4" aria-hidden="true" />
          Chats
        </Button>
      </div>

      <SlideOver
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title="Workspace chats"
        description="Switch between conversations"
        side="left"
        className="w-[min(88vw,20rem)]"
      >
        <ChatSessionList
          workspaceId={workspaceId}
          activeSessionId={activeSessionId}
          onNavigate={() => setMobileOpen(false)}
        />
      </SlideOver>
    </>
  );
}
