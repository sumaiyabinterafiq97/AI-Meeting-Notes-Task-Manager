import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { ErrorBoundary } from '@/components/ai/ErrorBoundary';
import { ChatSkeleton } from '@/components/ai/LoadingSkeleton';
import { ROUTES } from '@/lib/constants';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useChatSessionMessages } from '../hooks/useChatSessionMessages';
import { useWorkspaceChatStream } from '../hooks/useWorkspaceChatStream';
import { WORKSPACE_CHAT_EMPTY_STATE_EXAMPLES } from '../types/chat.types';
import { ChatEmptyState } from './ChatEmptyState';
import { ChatComposer } from './ChatComposer';
import { ChatMessageList } from './ChatMessageList';

interface WorkspaceChatPanelProps {
  workspaceId: string;
  sessionId?: string;
}

export function WorkspaceChatPanel({ workspaceId, sessionId }: WorkspaceChatPanelProps) {
  const navigate = useNavigate();
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);

  const { data: messages = [], isLoading, isError, error } = useChatSessionMessages(
    workspaceId,
    sessionId,
  );

  const {
    streamingContent,
    streamingCitations,
    isStreaming,
    streamError,
    sendMessage,
    regenerate,
    cancelStream,
    clearStreamError,
  } = useWorkspaceChatStream({
    workspaceId,
    sessionId,
    onSessionCreated: (createdSessionId) => {
      navigate(ROUTES.CHAT_SESSION(workspaceId, createdSessionId), { replace: true });
    },
  });

  const isChatDisabled = isStreaming;

  const handleSend = async (message: string) => {
    setPendingUserMessage(message);
    clearStreamError();
    try {
      await sendMessage(message, sessionId);
    } finally {
      setPendingUserMessage(null);
    }
  };

  const handleExampleClick = (example: string) => {
    void handleSend(example);
  };

  const handleRegenerate = () => {
    void regenerate(messages);
  };

  const showEmptyState =
    !sessionId && messages.length === 0 && !isStreaming && !pendingUserMessage && !isLoading;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold">Workspace AI Chat</h2>
        <p className="text-sm text-muted-foreground">
          Ask questions across meetings, tasks, and workspace knowledge with cited answers.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        {streamError && <ErrorAlert message={streamError} />}

        {sessionId && isError && (
          <ErrorAlert message={getApiErrorMessage(error, 'Failed to load chat history')} />
        )}

        <ErrorBoundary fallbackTitle="Chat failed to load">
          {sessionId && isLoading ? (
            <ChatSkeleton />
          ) : showEmptyState ? (
            <div className="flex flex-1 items-center justify-center">
              <ChatEmptyState
                title="Ask your workspace"
                description="Search across meetings and tasks with grounded, cited AI answers."
                examples={WORKSPACE_CHAT_EMPTY_STATE_EXAMPLES}
                onExampleClick={handleExampleClick}
                disabled={isChatDisabled}
              />
            </div>
          ) : (
            <ChatMessageList
              messages={messages}
              workspaceId={workspaceId}
              streamingContent={streamingContent}
              streamingCitations={streamingCitations}
              isStreaming={isStreaming}
              pendingUserMessage={pendingUserMessage}
              onRegenerate={handleRegenerate}
              isRegenerating={isStreaming}
              fullHeight
            />
          )}
        </ErrorBoundary>

        <ChatComposer
          onSubmit={(message) => void handleSend(message)}
          onCancel={cancelStream}
          isStreaming={isStreaming}
          disabled={isChatDisabled}
          placeholder="Ask anything about this workspace…"
        />
      </div>
    </div>
  );
}
