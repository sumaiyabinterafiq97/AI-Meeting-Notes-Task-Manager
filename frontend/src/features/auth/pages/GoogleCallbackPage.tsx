import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { ROUTES } from '@/lib/constants';
import { useAuth } from '../hooks/useAuth';

/**
 * Completes Google OAuth after backend sets the refresh cookie and redirects here.
 */
export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { hydrateSession } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function complete() {
      const maxAttempts = 3;
      let lastError: unknown;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          await hydrateSession();
          if (cancelled) return;
          navigate(ROUTES.WORKSPACES, { replace: true });
          return;
        } catch (error) {
          lastError = error;
          // Cookie from OAuth redirect can lag one tick behind the callback page mount.
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
          }
        }
      }

      if (!cancelled) {
        console.error('Google callback hydrate failed', lastError);
        setError(params.get('error') ?? 'Google sign-in failed. Please try again.');
      }
    }

    void complete();
    return () => {
      cancelled = true;
    };
  }, [hydrateSession, navigate, params]);

  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16">
        <ErrorAlert message={error} />
        <p className="text-center text-sm">
          <Link to={ROUTES.LOGIN} className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-24">
      <LoadingSpinner label="Completing Google sign-in" />
    </div>
  );
}
