import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/render-with-providers';
import { InsightsPage } from '@/features/insights/pages/InsightsPage';
import { dashboardApi } from '@/features/dashboard/services/dashboard-api';
import { insightsApi } from '@/features/dashboard/services/insights-api';
import { knowledgeApi } from '@/features/knowledge/services/knowledge-api';

vi.mock('@/features/dashboard/services/dashboard-api', () => ({
  dashboardApi: { get: vi.fn() },
}));

vi.mock('@/features/dashboard/services/insights-api', () => ({
  insightsApi: { getWorkspace: vi.fn() },
}));

vi.mock('@/features/knowledge/services/knowledge-api', () => ({
  knowledgeApi: { list: vi.fn() },
}));

describe('InsightsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(dashboardApi.get).mockResolvedValue({
      data: {
        stats: {
          totalMeetings: 2,
          openTasks: 1,
          overdueTasks: 0,
          completedThisWeek: 1,
        },
        aiMetrics: {
          summariesGenerated: 2,
          pendingActionItems: 1,
          failedProcessing: 0,
        },
        recommendations: [
          {
            id: 'rec-1',
            type: 'risk',
            title: 'Vendor delay risk',
            description: 'Launch may slip.',
            priority: 'high',
            meetingId: 'm-1',
            meetingTitle: 'Sprint Planning',
          },
        ],
        tasksDueSoon: [],
        recentMeetings: [],
        productivity: { tasksCompletedPerWeek: [], avgDaysToComplete: null },
        recentActivity: [],
      },
    } as never);

    vi.mocked(insightsApi.getWorkspace).mockResolvedValue({
      data: {
        insights: [
          {
            id: 'meetings-this-week',
            type: 'trend',
            title: 'Meetings this week',
            description: '2 meetings held this week.',
          },
        ],
        narrative: 'Productivity is steady this week.',
        generatedAt: '2026-06-17T00:00:00.000Z',
      },
    } as never);

    vi.mocked(knowledgeApi.list).mockResolvedValue({
      data: {
        data: [
          {
            id: 'k-1',
            workspaceId: 'ws-1',
            sourceMeetingId: 'm-1',
            entityType: 'DECISION',
            title: 'Ship Friday',
            content: 'Team agreed to ship on Friday.',
            confidence: 0.9,
            createdAt: '2026-06-16T00:00:00.000Z',
            updatedAt: '2026-06-16T00:00:00.000Z',
          },
        ],
      },
    } as never);
  });

  it('renders workspace insights hub sections', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/workspaces/:workspaceId/insights" element={<InsightsPage />} />
      </Routes>,
      { route: '/workspaces/ws-1/insights' },
    );

    expect(await screen.findByRole('heading', { name: /^insights$/i })).toBeInTheDocument();
    expect(screen.getByText(/productivity is steady this week/i)).toBeInTheDocument();
    expect(screen.getAllByText(/vendor delay risk/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/ship friday/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /semantic search/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /knowledge base/i })).toBeInTheDocument();
  });
});
