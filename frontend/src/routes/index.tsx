import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { PublicRoute } from '@/routes/PublicRoute';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { WorkspaceListPage } from '@/features/workspaces/pages/WorkspaceListPage';
import { WorkspaceSettingsPage } from '@/features/workspaces/pages/WorkspaceSettingsPage';
import { AcceptInvitationPage } from '@/features/workspaces/pages/AcceptInvitationPage';
import { MeetingListPage } from '@/features/meetings/pages/MeetingListPage';
import { TaskBoardPage } from '@/features/tasks/pages/TaskBoardPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { NotificationPreferencesPage } from '@/features/notifications/pages/NotificationPreferencesPage';
import { ROUTES } from '@/lib/constants';
import {
  LazyChatPage,
  LazyInsightsPage,
  LazyKnowledgePage,
  LazyMeetingDetailPage,
  LazyReportDetailPage,
  LazyReportsListPage,
  LazySearchPage,
} from '@/routes/lazy-pages';
import { withRouteSuspense } from '@/routes/with-suspense';

const SearchPage = withRouteSuspense(LazySearchPage, 'Loading search');
const ChatPage = withRouteSuspense(LazyChatPage, 'Loading chat');
const InsightsPage = withRouteSuspense(LazyInsightsPage, 'Loading insights');
const ReportsListPage = withRouteSuspense(LazyReportsListPage, 'Loading reports');
const ReportDetailPage = withRouteSuspense(LazyReportDetailPage, 'Loading report');
const KnowledgePage = withRouteSuspense(LazyKnowledgePage, 'Loading knowledge base');
const MeetingDetailPage = withRouteSuspense(LazyMeetingDetailPage, 'Loading meeting');

export const router = createBrowserRouter([
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
          { path: '/workspaces/:workspaceId/dashboard', element: <DashboardPage /> },
          { path: '/workspaces/:workspaceId/insights', element: <InsightsPage /> },
          { path: '/workspaces/:workspaceId/meetings', element: <MeetingListPage /> },
          { path: '/workspaces/:workspaceId/meetings/:meetingId', element: <MeetingDetailPage /> },
          { path: '/workspaces/:workspaceId/tasks', element: <TaskBoardPage /> },
          { path: '/workspaces/:workspaceId/search', element: <SearchPage /> },
          { path: '/workspaces/:workspaceId/chat', element: <ChatPage /> },
          { path: '/workspaces/:workspaceId/chat/:sessionId', element: <ChatPage /> },
          { path: '/workspaces/:workspaceId/reports', element: <ReportsListPage /> },
          { path: '/workspaces/:workspaceId/reports/:reportId', element: <ReportDetailPage /> },
          { path: '/workspaces/:workspaceId/knowledge', element: <KnowledgePage /> },
          { path: '/workspaces/:workspaceId/settings', element: <WorkspaceSettingsPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={ROUTES.LOGIN} replace />,
  },
]);
