import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { sendChatMessageSchema, type SendChatMessageFormData } from '../schemas/chat.schemas';
import { MAX_CHAT_MESSAGE_LENGTH } from '../types/chat.types';
import { cn } from '@/lib/utils';

interface ChatComposerProps {
  onSubmit: (message: string) => void;
  onCancel?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatComposer({
  onSubmit,
  onCancel,
  isStreaming = false,
  disabled = false,
  placeholder = 'Ask a question about this meeting…',
  className,
}: ChatComposerProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<SendChatMessageFormData>({
    resolver: zodResolver(sendChatMessageSchema),
    defaultValues: { message: '' },
  });

  const message = useWatch({ control, name: 'message', defaultValue: '' });
  const charCount = message.length;
  const isDisabled = disabled || isStreaming;

  const submit = handleSubmit((data) => {
    onSubmit(data.message.trim());
    reset();
  });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <form onSubmit={submit} className={cn('space-y-2', className)} noValidate>
      <div className="relative">
        <Textarea
          {...register('message')}
          rows={2}
          placeholder={placeholder}
          disabled={isDisabled}
          onKeyDown={handleKeyDown}
          aria-label="Chat message"
          aria-invalid={Boolean(errors.message)}
          className="min-h-[4.5rem] resize-none pr-12"
        />
        {isStreaming ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute bottom-2 right-2 h-9 w-9"
            onClick={onCancel}
            aria-label="Stop generating"
          >
            <Square className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            className="absolute bottom-2 right-2 h-9 w-9"
            disabled={isDisabled || charCount === 0}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {errors.message?.message ?? 'Enter to send · Shift+Enter for new line'}
        </span>
        <span className={cn(charCount > MAX_CHAT_MESSAGE_LENGTH && 'text-destructive')}>
          {charCount}/{MAX_CHAT_MESSAGE_LENGTH}
        </span>
      </div>
    </form>
  );
}
