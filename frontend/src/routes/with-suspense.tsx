import { type ComponentType, Suspense } from 'react';
import { PageLoader } from '@/components/common/PageLoader';

export function withRouteSuspense(
  Component: ComponentType,
  label = 'Loading page',
): ComponentType {
  function SuspendedRoute() {
    return (
      <Suspense fallback={<PageLoader label={label} />}>
        <Component />
      </Suspense>
    );
  }

  return SuspendedRoute;
}
