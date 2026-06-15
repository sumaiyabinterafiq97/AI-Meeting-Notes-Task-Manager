import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';

interface ProtectedRouteProps {
  isAuthenticated?: boolean;
}

export function ProtectedRoute({ isAuthenticated = false }: ProtectedRouteProps) {
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
