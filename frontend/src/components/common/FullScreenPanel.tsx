import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FullScreenPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function FullScreenPanel({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: FullScreenPanelProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className={cn('fixed inset-0 z-[100] flex flex-col bg-background xl:hidden', className)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fullscreen-panel-title"
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 id="fullscreen-panel-title" className="text-base font-semibold">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
    </div>,
    document.body,
  );
}
