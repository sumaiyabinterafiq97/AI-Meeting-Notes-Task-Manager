import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { renderWithProviders } from '@/test/render-with-providers';
import { authApi } from '@/features/auth/services/auth-api';
import { dashboardApi } from '@/features/dashboard/services/dashboard-api';
import { insightsApi } from '@/features/dashboard/services/insights-api';

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

vi.mock('@/features/dashboard/services/insights-api', () => ({
  insightsApi: {
    getWorkspace: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
};

const workspaceRoute = '/workspaces/ws-1/dashboard';

const mockDashboard = {
  stats: {
    totalMeetings: 5,
    openTasks: 12,
    overdueTasks: 2,
    completedThisWeek: 4,
  },
  aiMetrics: {
    summariesGenerated: 3,
    pendingActionItems: 1,
    failedProcessing: 0,
  },
  recommendations: [
    {
      id: 'rec-1',
      type: 'action_item' as const,
      title: 'Review pending action items',
      description: '1 extracted follow-up needs review.',
      priority: 'medium' as const,
      meetingId: 'meeting-1',
      meetingTitle: 'Sprint Planning',
    },
  ],
  tasksDueSoon: [
    {
      id: 'task-1',
      title: 'Ship dashboard',
      dueDate: '2026-06-20T00:00:00.000Z',
      status: 'TODO',
      priority: 'HIGH',
      assigneeName: 'Test User',
      isOverdue: false,
    },
  ],
  recentMeetings: [
    {
      id: 'meeting-1',
      title: 'Sprint Planning',
      meetingDate: '2026-06-15T10:00:00.000Z',
      status: 'READY',
      hasAiSummary: true,
    },
  ],
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
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.refresh).mockResolvedValue({ data: { accessToken: 'token' } } as never);
    vi.mocked(authApi.getMe).mockResolvedValue({ data: mockUser } as never);
    vi.mocked(dashboardApi.get).mockResolvedValue({ data: mockDashboard } as never);
    vi.mocked(insightsApi.getWorkspace).mockResolvedValue({
      data: {
        insights: [
          {
            id: 'insight-1',
            type: 'trend',
            title: 'Meetings this week',
            description: '2 meetings held this week.',
          },
        ],
        narrative: 'The workspace is making steady progress.',
        generatedAt: '2026-06-15T10:00:00.000Z',
      },
    } as never);
  });

  it('renders stats, AI sections, and activity feed', async () => {
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
    expect(screen.getByText('AI Summaries')).toBeInTheDocument();
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Recent Meetings')).toBeInTheDocument();
    expect(screen.getByText('Tasks Due Soon')).toBeInTheDocument();
    expect(await screen.findByText(/steady progress/i)).toBeInTheDocument();
    expect(screen.getByText(/created task "review api"/i)).toBeInTheDocument();
  });
});
