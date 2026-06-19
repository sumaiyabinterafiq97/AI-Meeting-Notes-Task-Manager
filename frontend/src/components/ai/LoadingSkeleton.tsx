import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} aria-hidden="true" />;
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading chat">
      <div className="flex justify-end">
        <LoadingSkeleton className="h-10 w-2/3 max-w-xs" />
      </div>
      <div className="flex justify-start">
        <LoadingSkeleton className="h-16 w-3/4 max-w-md" />
      </div>
      <div className="flex justify-end">
        <LoadingSkeleton className="h-10 w-1/2 max-w-xs" />
      </div>
    </div>
  );
}

interface PageSkeletonProps {
  children?: ReactNode;
}

export function PageSkeleton({ children }: PageSkeletonProps) {
  return (
    <div className="space-y-6" aria-busy="true">
      <LoadingSkeleton className="h-8 w-48" />
      <LoadingSkeleton className="h-4 w-72" />
      {children ?? <LoadingSkeleton className="h-64 w-full" />}
    </div>
  );
}
