import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { getApiErrorMessage } from '@/lib/api-errors';
import { ROUTES } from '@/lib/constants';
import { useAcceptInvitation } from '../hooks/useAcceptInvitation';
import { useWorkspaceContext } from '../hooks/useWorkspaceContext';

export function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { mutate, isPending, isError, error } = useAcceptInvitation();
  const { setActiveWorkspaceId } = useWorkspaceContext();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!token || attemptedRef.current) return;
    attemptedRef.current = true;

    mutate(token, {
      onSuccess: (response) => {
        setActiveWorkspaceId(response.data.workspace.id);
        navigate(ROUTES.CHAT(response.data.workspace.id), { replace: true });
      },
    });
  }, [token, mutate, navigate, setActiveWorkspaceId]);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid invitation</CardTitle>
            <CardDescription>This invitation link is missing or malformed.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={ROUTES.WORKSPACES} className="text-sm font-medium text-primary hover:underline">
              Go to workspaces
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/40 p-4">
        <LoadingSpinner label="Accepting invitation" />
        <p className="text-sm text-muted-foreground">Joining workspace…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Unable to accept invitation</CardTitle>
            <CardDescription>
              This invitation may be invalid, expired, or already used.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ErrorAlert
              message={getApiErrorMessage(
                error,
                'This invitation may be invalid or expired.',
              )}
            />
            <Link to={ROUTES.WORKSPACES} className="text-sm font-medium text-primary hover:underline">
              Go to workspaces
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <LoadingSpinner label="Redirecting" />
    </div>
  );
}
