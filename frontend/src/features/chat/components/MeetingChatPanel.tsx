import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { ErrorBoundary } from '@/components/ai/ErrorBoundary';
import { ChatSkeleton } from '@/components/ai/LoadingSkeleton';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useMeetingChatMessages } from '../hooks/useMeetingChatMessages';
import { useMeetingChatStream } from '../hooks/useMeetingChatStream';
import { ChatEmptyState } from './ChatEmptyState';
import { ChatComposer } from './ChatComposer';
import { ChatMessageList } from './ChatMessageList';

import { cn } from '@/lib/utils';

interface MeetingChatPanelProps {
  workspaceId: string;
  meetingId: string;
  meetingTitle: string;
  disabled?: boolean;
  disabledReason?: string;
  embedded?: boolean;
  className?: string;
}

export function MeetingChatPanel({
  workspaceId,
  meetingId,
  meetingTitle,
  disabled = false,
  disabledReason,
  embedded = false,
  className,
}: MeetingChatPanelProps) {
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const { data: messages = [], isLoading, isError, error } = useMeetingChatMessages(
    workspaceId,
    meetingId,
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
  } = useMeetingChatStream({ workspaceId, meetingId });

  const sessionId = messages[0]?.sessionId;
  const isChatDisabled = disabled || isStreaming;

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

  const chatBody = (
    <div className={cn('space-y-4', embedded && 'flex min-h-[min(70dvh,640px)] flex-col', className)}>
      {disabled && disabledReason && (
        <p className="text-sm text-muted-foreground" role="status">
          {disabledReason}
        </p>
      )}

      {streamError && <ErrorAlert message={streamError} />}

      {isError && (
        <ErrorAlert message={getApiErrorMessage(error, 'Failed to load chat history')} />
      )}

      <ErrorBoundary fallbackTitle="Chat failed to load">
        <div className={cn(embedded && 'min-h-0 flex-1')}>
          {isLoading ? (
            <ChatSkeleton />
          ) : messages.length === 0 && !isStreaming && !pendingUserMessage ? (
            <ChatEmptyState onExampleClick={handleExampleClick} disabled={isChatDisabled} />
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
            />
          )}
        </div>
      </ErrorBoundary>

      <ChatComposer
        onSubmit={(message) => void handleSend(message)}
        onCancel={cancelStream}
        isStreaming={isStreaming}
        disabled={isChatDisabled}
      />
    </div>
  );

  if (embedded) {
    return chatBody;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meeting AI Chat</CardTitle>
        <CardDescription>
          Ask questions about &ldquo;{meetingTitle}&rdquo; with grounded, cited answers.
        </CardDescription>
      </CardHeader>
      <CardContent>{chatBody}</CardContent>
    </Card>
  );
}
