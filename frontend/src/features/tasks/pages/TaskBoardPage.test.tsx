import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { TaskBoardPage } from '@/features/tasks/pages/TaskBoardPage';
import { renderWithProviders } from '@/test/render-with-providers';
import { authApi } from '@/features/auth/services/auth-api';
import { taskApi } from '@/features/tasks/services/task-api';
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

vi.mock('@/features/tasks/services/task-api', () => ({
  taskApi: {
    list: vi.fn(),
    getBoard: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    listComments: vi.fn(),
    createComment: vi.fn(),
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

const workspaceRoute = '/workspaces/ws-1/tasks';

function renderTaskBoardPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/workspaces/:workspaceId/tasks" element={<TaskBoardPage />} />
    </Routes>,
    { route: workspaceRoute },
  );
}

const sampleTask = {
  id: 'task-1',
  workspaceId: 'ws-1',
  meetingId: null,
  actionItemId: null,
  createdById: 'user-1',
  title: 'Review API docs',
  description: null,
  status: 'TODO' as const,
  priority: 'HIGH' as const,
  assigneeId: 'user-1',
  dueDate: '2026-06-20T00:00:00.000Z',
  position: 1,
  completedAt: null,
  createdAt: '2026-06-15T09:00:00.000Z',
  updatedAt: '2026-06-15T09:00:00.000Z',
};

describe('TaskBoardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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

  it('renders empty state when board has no tasks', async () => {
    vi.mocked(taskApi.getBoard).mockResolvedValue({
      data: { TODO: [], IN_PROGRESS: [], DONE: [] },
    } as never);

    renderTaskBoardPage();

    await waitFor(() => {
      expect(taskApi.getBoard).toHaveBeenCalled();
    });

    expect(await screen.findByText(/no tasks yet/i)).toBeInTheDocument();
  });

  it('renders kanban columns with tasks', async () => {
    vi.mocked(taskApi.getBoard).mockResolvedValue({
      data: { TODO: [sampleTask], IN_PROGRESS: [], DONE: [] },
    } as never);

    renderTaskBoardPage();

    expect(await screen.findByText('Review API docs')).toBeInTheDocument();
    expect(screen.getByLabelText(/to do column/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/in progress column/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/done column/i)).toBeInTheDocument();
  });

  it('opens create task dialog', async () => {
    const user = userEvent.setup();
    vi.mocked(taskApi.getBoard).mockResolvedValue({
      data: { TODO: [], IN_PROGRESS: [], DONE: [] },
    } as never);

    renderTaskBoardPage();

    const createButtons = await screen.findAllByRole('button', { name: /new task/i });
    await user.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText(/^title$/i)).toBeInTheDocument();
    });
  });
});
