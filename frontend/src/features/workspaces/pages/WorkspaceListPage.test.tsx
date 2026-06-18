import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspaceListPage } from '@/features/workspaces/pages/WorkspaceListPage';
import { renderWithProviders } from '@/test/render-with-providers';
import { authApi } from '@/features/auth/services/auth-api';
import { workspaceApi } from '@/features/workspaces/services/workspace-api';

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

vi.mock('@/features/workspaces/services/workspace-api', () => ({
  workspaceApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    listMembers: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    listInvitations: vi.fn(),
    createInvitation: vi.fn(),
    acceptInvitation: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
};

describe('WorkspaceListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(authApi.refresh).mockResolvedValue({ data: { accessToken: 'token' } } as never);
    vi.mocked(authApi.getMe).mockResolvedValue({ data: mockUser } as never);
  });

  it('renders empty state when user has no workspaces', async () => {
    vi.mocked(workspaceApi.list).mockResolvedValue({ data: { data: [] } } as never);

    renderWithProviders(<WorkspaceListPage />);

    await waitFor(() => {
      expect(workspaceApi.list).toHaveBeenCalled();
    });

    expect(await screen.findByText(/no workspaces yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create workspace/i })).toBeInTheDocument();
  });

  it('renders workspace cards when workspaces exist', async () => {
    vi.mocked(workspaceApi.list).mockResolvedValue({
      data: {
        data: [
          {
            id: 'ws-1',
            name: 'Engineering',
            slug: 'engineering',
            role: 'OWNER',
            memberCount: 3,
            createdAt: '2026-06-01T00:00:00.000Z',
          },
        ],
      },
    } as never);

    renderWithProviders(<WorkspaceListPage />);

    expect(await screen.findByText('Engineering')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open workspace/i })).toBeInTheDocument();
  });

  it('opens create workspace dialog', async () => {
    const user = userEvent.setup();
    vi.mocked(workspaceApi.list).mockResolvedValue({ data: { data: [] } } as never);

    renderWithProviders(<WorkspaceListPage />);

    const createButton = await screen.findByRole('button', { name: /create workspace/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/workspace name/i)).toBeInTheDocument();
    });
  });
});
