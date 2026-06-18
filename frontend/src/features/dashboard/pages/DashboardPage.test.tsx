import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { renderWithProviders } from '@/test/render-with-providers';
import { authApi } from '@/features/auth/services/auth-api';
import { dashboardApi } from '@/features/dashboard/services/dashboard-api';

vi.mock('@/features/auth/services/auth-api', () => ({
  authApi: {
    refresh: vi.fn(),
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

vi.mock('@/features/dashboard/services/dashboard-api', () => ({
  dashboardApi: {
    get: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
};

const workspaceRoute = '/workspaces/ws-1/dashboard';

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.refresh).mockResolvedValue({ data: { accessToken: 'token' } } as never);
    vi.mocked(authApi.getMe).mockResolvedValue({ data: mockUser } as never);
  });

  it('renders stats and activity feed', async () => {
    vi.mocked(dashboardApi.get).mockResolvedValue({
      data: {
        stats: {
          totalMeetings: 5,
          openTasks: 12,
          overdueTasks: 2,
          completedThisWeek: 4,
        },
        productivity: {
          tasksCompletedPerWeek: [
            { week: '2026-W23', count: 3 },
            { week: '2026-W24', count: 4 },
          ],
          avgDaysToComplete: 3.5,
        },
        recentActivity: [
          {
            id: 'act-1',
            action: 'task.created',
            actor: { displayName: 'Test User' },
            entityType: 'task',
            entityId: 'task-1',
            metadata: { title: 'Review API' },
            createdAt: '2026-06-15T10:00:00.000Z',
          },
        ],
      },
    } as never);

    renderWithProviders(
      <Routes>
        <Route path="/workspaces/:workspaceId/dashboard" element={<DashboardPage />} />
      </Routes>,
      { route: workspaceRoute },
    );

    await waitFor(() => {
      expect(dashboardApi.get).toHaveBeenCalled();
    });

    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('Open Tasks')).toBeInTheDocument();
    expect(screen.getByText(/created task "review api"/i)).toBeInTheDocument();
  });
});
