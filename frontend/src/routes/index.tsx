import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { PublicRoute } from '@/routes/PublicRoute';
import { RedirectToMeetings } from '@/routes/RedirectToMeetings';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { GoogleCallbackPage } from '@/features/auth/pages/GoogleCallbackPage';
import { WorkspaceListPage } from '@/features/workspaces/pages/WorkspaceListPage';
import { WorkspaceSettingsPage } from '@/features/workspaces/pages/WorkspaceSettingsPage';
import { AcceptInvitationPage } from '@/features/workspaces/pages/AcceptInvitationPage';
import { MeetingListPage } from '@/features/meetings/pages/MeetingListPage';
import { NotificationPreferencesPage } from '@/features/notifications/pages/NotificationPreferencesPage';
import { ROUTES } from '@/lib/constants';
import { LazyMeetingDetailPage } from '@/routes/lazy-pages';
import { withRouteSuspense } from '@/routes/with-suspense';

const MeetingDetailPage = withRouteSuspense(LazyMeetingDetailPage, 'Loading meeting');

export const router = createBrowserRouter([
  {
    path: ROUTES.GOOGLE_CALLBACK,
    element: <GoogleCallbackPage />,
  },
  {
    element: <PublicRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: ROUTES.LOGIN, element: <LoginPage /> },
          { path: ROUTES.REGISTER, element: <RegisterPage /> },
          { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
          { path: ROUTES.RESET_PASSWORD, element: <ResetPasswordPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: ROUTES.WORKSPACES, element: <WorkspaceListPage /> },
      { path: ROUTES.ACCOUNT_NOTIFICATIONS, element: <NotificationPreferencesPage /> },
      { path: '/invitations/:token/accept', element: <AcceptInvitationPage /> },
      {
        element: <AppLayout />,
        children: [
          { path: '/workspaces/:workspaceId/meetings', element: <MeetingListPage /> },
          { path: '/workspaces/:workspaceId/meetings/:meetingId', element: <MeetingDetailPage /> },
          { path: '/workspaces/:workspaceId/settings', element: <WorkspaceSettingsPage /> },
          // Soft-hide non-core surfaces — keep URLs resolving without exposing product complexity
          { path: '/workspaces/:workspaceId/dashboard', element: <RedirectToMeetings /> },
          { path: '/workspaces/:workspaceId/insights', element: <RedirectToMeetings /> },
          { path: '/workspaces/:workspaceId/tasks', element: <RedirectToMeetings /> },
          { path: '/workspaces/:workspaceId/search', element: <RedirectToMeetings /> },
          { path: '/workspaces/:workspaceId/chat', element: <RedirectToMeetings /> },
          { path: '/workspaces/:workspaceId/chat/:sessionId', element: <RedirectToMeetings /> },
          { path: '/workspaces/:workspaceId/reports', element: <RedirectToMeetings /> },
          { path: '/workspaces/:workspaceId/reports/:reportId', element: <RedirectToMeetings /> },
          { path: '/workspaces/:workspaceId/knowledge', element: <RedirectToMeetings /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={ROUTES.LOGIN} replace />,
  },
]);
