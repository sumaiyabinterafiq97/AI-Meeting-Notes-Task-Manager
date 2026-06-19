import { useState } from 'react';
import { Copy, Check, RotateCcw, User, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from '@/components/ai/MarkdownRenderer';
import { TypingIndicator } from '@/components/ai/TypingIndicator';
import { cn } from '@/lib/utils';
import type { CitationData } from '@/components/ai/CitationCard';

export type ChatBubbleRole = 'user' | 'assistant';

interface ChatBubbleProps {
  role: ChatBubbleRole;
  content: string;
  citations?: CitationData[];
  isStreaming?: boolean;
  showActions?: boolean;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  className?: string;
}

export function ChatBubble({
  role,
  content,
  citations = [],
  isStreaming = false,
  showActions = false,
  onRegenerate,
  isRegenerating = false,
  className,
}: ChatBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = role === 'user';

  const handleCopy = async () => {
    if (!content) {
      return;
    }
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start', className)}
      data-role={role}
    >
      {!isUser && (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div className={cn('max-w-[85%] space-y-2 sm:max-w-[75%]', isUser && 'order-first')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'border bg-card text-card-foreground shadow-sm',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{content}</p>
          ) : content ? (
            <MarkdownRenderer content={content} />
          ) : isStreaming ? (
            <TypingIndicator />
          ) : null}

          {isStreaming && content && <TypingIndicator className="mt-1" />}
        </div>

        {!isUser && citations.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Sources:{' '}
            {citations.map((citation, index) => (
              <span key={citation.index}>
                {index > 0 && ', '}
                <span className="font-medium">[{citation.index}]</span>
                {citation.meetingTitle ? ` ${citation.meetingTitle}` : ''}
              </span>
            ))}
          </p>
        )}

        {!isUser && showActions && content && !isStreaming && (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => void handleCopy()}
              aria-label={copied ? 'Copied' : 'Copy response'}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            {onRegenerate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={onRegenerate}
                disabled={isRegenerating}
                aria-label="Regenerate response"
              >
                <RotateCcw
                  className={cn('h-3.5 w-3.5', isRegenerating && 'animate-spin')}
                  aria-hidden="true"
                />
                Regenerate
              </Button>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted"
          aria-hidden="true"
        >
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
