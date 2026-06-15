import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';

interface PublicRouteProps {
  isAuthenticated?: boolean;
}

export function PublicRoute({ isAuthenticated = false }: PublicRouteProps) {
  if (isAuthenticated) {
    return <Navigate to={ROUTES.WORKSPACES} replace />;
  }

  return <Outlet />;
}
