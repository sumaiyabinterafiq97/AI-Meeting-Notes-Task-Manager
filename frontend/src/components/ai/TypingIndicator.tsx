import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  className?: string;
  label?: string;
}

export function TypingIndicator({ className, label = 'AI is typing' }: TypingIndicatorProps) {
  return (
    <div
      className={cn('flex items-center gap-1.5 px-1 py-2', className)}
      role="status"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 motion-reduce:animate-none"
          style={{ animationDelay: `${index * 150}ms` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
