import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { renderWithProviders } from '@/test/render-with-providers';
import { authApi } from '@/features/auth/services/auth-api';
import { notificationApi } from '@/features/notifications/services/notification-api';

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

vi.mock('@/features/notifications/services/notification-api', () => ({
  notificationApi: {
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
};

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.refresh).mockResolvedValue({ data: { accessToken: 'token' } } as never);
    vi.mocked(authApi.getMe).mockResolvedValue({ data: mockUser } as never);
    vi.mocked(notificationApi.list).mockImplementation((filters) => {
      if (filters?.unreadOnly) {
        return Promise.resolve({
          data: { data: [], meta: { page: 1, limit: 1, total: 2, totalPages: 2 } },
        } as never);
      }

      return Promise.resolve({
        data: {
          data: [
            {
              id: 'n-1',
              type: 'TASK_ASSIGNED',
              payload: { taskId: 'task-1', taskTitle: 'Review API', assignedById: 'user-2' },
              workspaceId: 'ws-1',
              isRead: false,
              createdAt: '2026-06-15T10:00:00.000Z',
            },
          ],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      } as never);
    });
  });

  it('shows unread badge count', async () => {
    renderWithProviders(<NotificationBell />);

    expect(await screen.findByLabelText(/notifications, 2 unread/i)).toBeInTheDocument();
  });

  it('opens dropdown with notifications', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationBell />);

    await user.click(await screen.findByLabelText(/notifications/i));

    await waitFor(() => {
      expect(screen.getByText(/you were assigned to "review api"/i)).toBeInTheDocument();
    });
  });
});
