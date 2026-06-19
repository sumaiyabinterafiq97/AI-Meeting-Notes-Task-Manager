import { useEffect, useRef } from 'react';
import { ChatBubble } from '@/components/ai/ChatBubble';
import { CitationCard } from '@/components/ai/CitationCard';
import type { CitationData } from '@/components/ai/CitationCard';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '../types/chat.types';

interface ChatMessageListProps {
  messages: ChatMessage[];
  workspaceId: string;
  streamingContent?: string;
  streamingCitations?: CitationData[];
  isStreaming?: boolean;
  pendingUserMessage?: string | null;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  fullHeight?: boolean;
}

export function ChatMessageList({
  messages,
  workspaceId,
  streamingContent = '',
  streamingCitations = [],
  isStreaming = false,
  pendingUserMessage = null,
  onRegenerate,
  isRegenerating = false,
  fullHeight = false,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageId = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant')?.id;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, streamingContent, pendingUserMessage, isStreaming]);

  return (
    <div
      className={cn(
        'flex flex-col gap-4 overflow-y-auto px-1 py-2',
        fullHeight ? 'min-h-0 flex-1' : 'max-h-[28rem]',
      )}
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label="Chat messages"
    >
      {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            <ChatBubble
              role={message.role === 'user' ? 'user' : 'assistant'}
              content={message.content}
              citations={message.citations}
              showActions={
                message.role === 'assistant' &&
                message.id === lastAssistantMessageId &&
                !isStreaming
              }
              onRegenerate={
                message.id === lastAssistantMessageId ? onRegenerate : undefined
              }
              isRegenerating={isRegenerating}
            />
            {message.role === 'assistant' && message.citations && message.citations.length > 0 && (
              <div className="ml-11 grid gap-2 sm:grid-cols-2">
                {message.citations.map((citation) => (
                  <CitationCard
                    key={`${message.id}-${citation.index}`}
                    citation={citation}
                    workspaceId={workspaceId}
                    compact
                  />
                ))}
              </div>
            )}
          </div>
        ))}

      {pendingUserMessage && (
        <ChatBubble role="user" content={pendingUserMessage} />
      )}

      {isStreaming && (
        <div className="space-y-2">
          <ChatBubble
            role="assistant"
            content={streamingContent}
            citations={streamingCitations}
            isStreaming={!streamingContent}
          />
          {streamingCitations.length > 0 && (
            <div className="ml-11 grid gap-2 sm:grid-cols-2">
              {streamingCitations.map((citation) => (
                <CitationCard
                  key={`stream-${citation.index}`}
                  citation={citation}
                  workspaceId={workspaceId}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
}
