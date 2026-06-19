import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { ReportsListPage } from '@/features/reports/pages/ReportsListPage';
import { renderWithProviders } from '@/test/render-with-providers';
import { authApi } from '@/features/auth/services/auth-api';
import { reportApi } from '@/features/reports/services/report-api';

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

vi.mock('@/features/reports/services/report-api', () => ({
  reportApi: {
    list: vi.fn(),
    getById: vi.fn(),
    generate: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
};

const mockReport = {
  id: 'report-1',
  workspaceId: 'ws-1',
  periodStart: '2026-06-10T00:00:00.000Z',
  periodEnd: '2026-06-16T00:00:00.000Z',
  title: 'Weekly Report 2026-06-10 – 2026-06-16',
  contentMarkdown: '# Weekly Report\n\nSummary content',
  contentJson: {
    title: 'Weekly Report',
    sections: [{ heading: 'Summary', content: 'Summary content' }],
    taskStats: { created: 2, completed: 1, open: 1 },
    meetingCount: 1,
  },
  status: 'COMPLETED' as const,
  modelVersion: 'mock',
  promptTokens: 100,
  completionTokens: 50,
  generatedAt: '2026-06-16T12:00:00.000Z',
  createdAt: '2026-06-16T12:00:00.000Z',
};

describe('ReportsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.refresh).mockResolvedValue({ data: { accessToken: 'token' } } as never);
    vi.mocked(authApi.getMe).mockResolvedValue({ data: mockUser } as never);
    vi.mocked(reportApi.list).mockResolvedValue({ data: { data: [mockReport] } } as never);
  });

  it('renders report list and generate panel', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/workspaces/:workspaceId/reports" element={<ReportsListPage />} />
      </Routes>,
      { route: '/workspaces/ws-1/reports' },
    );

    await waitFor(() => {
      expect(reportApi.list).toHaveBeenCalled();
    });

    expect(screen.getByRole('heading', { name: /^reports$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate report/i })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /weekly report 2026-06-10/i })).toBeInTheDocument();
  });
});
