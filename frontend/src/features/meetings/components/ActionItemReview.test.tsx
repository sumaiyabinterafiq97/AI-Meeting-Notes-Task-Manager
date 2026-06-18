import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionItemReview } from '@/features/meetings/components/ActionItemReview';
import { renderWithProviders } from '@/test/render-with-providers';
import { actionItemApi } from '@/features/meetings/services/action-item-api';
import { workspaceApi } from '@/features/workspaces/services/workspace-api';
import { authApi } from '@/features/auth/services/auth-api';

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

vi.mock('@/features/meetings/services/action-item-api', () => ({
  actionItemApi: {
    list: vi.fn(),
    accept: vi.fn(),
    reject: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
};

const actionItems = [
  {
    id: 'item-1',
    meetingId: 'meeting-1',
    title: 'Update API docs',
    description: 'Document the new endpoints',
    suggestedAssigneeId: 'user-1',
    suggestedDueDate: '2026-06-20T00:00:00.000Z',
    status: 'PENDING' as const,
    createdAt: '2026-06-15T10:00:00.000Z',
  },
  {
    id: 'item-2',
    meetingId: 'meeting-1',
    title: 'Schedule follow-up',
    description: null,
    suggestedAssigneeId: null,
    suggestedDueDate: null,
    status: 'ACCEPTED' as const,
    createdAt: '2026-06-15T10:01:00.000Z',
  },
];

describe('ActionItemReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.refresh).mockResolvedValue({ data: { accessToken: 'token' } } as never);
    vi.mocked(authApi.getMe).mockResolvedValue({ data: mockUser } as never);
    vi.mocked(workspaceApi.listMembers).mockResolvedValue({
      data: {
        data: [
          {
            userId: 'user-1',
            displayName: 'Test User',
            email: 'user@example.com',
            avatarUrl: null,
            role: 'OWNER',
            joinedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    } as never);
  });

  it('renders action items with status badges', async () => {
    renderWithProviders(
      <ActionItemReview workspaceId="ws-1" meetingId="meeting-1" actionItems={actionItems} />,
    );

    expect(await screen.findByText('Update API docs')).toBeInTheDocument();
    expect(screen.getByText('Schedule follow-up')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(await screen.findByText(/suggested: test user/i)).toBeInTheDocument();
  });

  it('accepts selected pending action items', async () => {
    const user = userEvent.setup();
    vi.mocked(actionItemApi.accept).mockResolvedValue({ data: { tasks: [] } } as never);

    renderWithProviders(
      <ActionItemReview workspaceId="ws-1" meetingId="meeting-1" actionItems={actionItems} />,
    );

    await user.click(screen.getByRole('checkbox', { name: /select update api docs/i }));
    await user.click(screen.getByRole('button', { name: /accept selected/i }));

    expect(actionItemApi.accept).toHaveBeenCalledWith('ws-1', 'meeting-1', ['item-1']);
  });
});
