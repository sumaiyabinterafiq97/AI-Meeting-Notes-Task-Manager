import { LoadingSpinner } from './LoadingSpinner';

interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label = 'Loading page' }: PageLoaderProps) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center py-16">
      <LoadingSpinner label={label} />
    </div>
  );
}
