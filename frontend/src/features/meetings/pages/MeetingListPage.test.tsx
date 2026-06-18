import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { MeetingListPage } from '@/features/meetings/pages/MeetingListPage';
import { renderWithProviders } from '@/test/render-with-providers';
import { authApi } from '@/features/auth/services/auth-api';
import { meetingApi } from '@/features/meetings/services/meeting-api';

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

vi.mock('@/features/meetings/services/meeting-api', () => ({
  meetingApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    uploadTranscript: vi.fn(),
    reprocess: vi.fn(),
  },
  detectSourceFormat: vi.fn(() => 'text'),
}));

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
};

const workspaceRoute = '/workspaces/ws-1/meetings';

function renderMeetingListPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/workspaces/:workspaceId/meetings" element={<MeetingListPage />} />
    </Routes>,
    { route: workspaceRoute },
  );
}

describe('MeetingListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(authApi.refresh).mockResolvedValue({ data: { accessToken: 'token' } } as never);
    vi.mocked(authApi.getMe).mockResolvedValue({ data: mockUser } as never);
  });

  it('renders empty state when workspace has no meetings', async () => {
    vi.mocked(meetingApi.list).mockResolvedValue({
      data: { data: [], meta: { page: 1, limit: 12, total: 0, totalPages: 0 } },
    } as never);

    renderMeetingListPage();

    await waitFor(() => {
      expect(meetingApi.list).toHaveBeenCalled();
    });

    expect(await screen.findByText(/no meetings yet/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /new meeting/i }).length).toBeGreaterThan(0);
  });

  it('renders meeting cards when meetings exist', async () => {
    vi.mocked(meetingApi.list).mockResolvedValue({
      data: {
        data: [
          {
            id: 'meeting-1',
            workspaceId: 'ws-1',
            title: 'Sprint Planning',
            meetingDate: '2026-06-15T10:00:00.000Z',
            durationMinutes: 60,
            attendees: [],
            tags: [],
            agenda: null,
            status: 'READY',
            createdById: 'user-1',
            createdAt: '2026-06-15T09:00:00.000Z',
          },
        ],
        meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
      },
    } as never);

    renderMeetingListPage();

    expect(await screen.findByText('Sprint Planning')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view meeting/i })).toBeInTheDocument();
  });

  it('opens create meeting dialog', async () => {
    const user = userEvent.setup();
    vi.mocked(meetingApi.list).mockResolvedValue({
      data: { data: [], meta: { page: 1, limit: 12, total: 0, totalPages: 0 } },
    } as never);

    renderMeetingListPage();

    const createButton = (await screen.findAllByRole('button', { name: /new meeting/i }))[0];
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/^title$/i)).toBeInTheDocument();
    });
  });
});
