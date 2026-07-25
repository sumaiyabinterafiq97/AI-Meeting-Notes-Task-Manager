import { Navigate, useParams } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';

/** Soft-hide non-core product surfaces by sending users to Meetings. */
export function RedirectToMeetings() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  if (!workspaceId) {
    return <Navigate to={ROUTES.WORKSPACES} replace />;
  }

  return <Navigate to={ROUTES.MEETINGS(workspaceId)} replace />;
}
