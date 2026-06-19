import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CHAT_EMPTY_STATE_EXAMPLES } from '../types/chat.types';

interface ChatEmptyStateProps {
  onExampleClick?: (example: string) => void;
  disabled?: boolean;
  title?: string;
  description?: string;
  examples?: readonly string[];
}

export function ChatEmptyState({
  onExampleClick,
  disabled = false,
  title = 'Ask about this meeting',
  description = 'Get grounded answers with citations from the transcript and AI analysis.',
  examples = CHAT_EMPTY_STATE_EXAMPLES,
}: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageSquare className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onExampleClick && examples.length > 0 && (
        <div className="mt-6 flex w-full max-w-md flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Try asking
          </p>
          {examples.map((example) => (
            <Button
              key={example}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto justify-start whitespace-normal px-3 py-2 text-left text-sm font-normal"
              disabled={disabled}
              onClick={() => onExampleClick(example)}
            >
              {example}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
