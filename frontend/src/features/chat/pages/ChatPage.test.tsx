import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { ChatPage } from '@/features/chat/pages/ChatPage';
import { renderWithProviders } from '@/test/render-with-providers';
import { authApi } from '@/features/auth/services/auth-api';
import { chatApi } from '@/features/chat/services/chat-api';

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

vi.mock('@/features/chat/services/chat-api', () => ({
  chatApi: {
    listWorkspaceSessions: vi.fn(),
    getSessionMessages: vi.fn(),
    streamWorkspaceMessage: vi.fn(),
    clearSession: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
};

describe('ChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.refresh).mockResolvedValue({ data: { accessToken: 'token' } } as never);
    vi.mocked(authApi.getMe).mockResolvedValue({ data: mockUser } as never);
    vi.mocked(chatApi.listWorkspaceSessions).mockResolvedValue({
      data: {
        data: [
          {
            id: 'session-1',
            userId: 'user-1',
            workspaceId: 'ws-1',
            title: 'Launch planning',
            scope: 'workspace',
            createdAt: '2026-06-15T10:00:00.000Z',
            updatedAt: '2026-06-15T11:00:00.000Z',
          },
        ],
      },
    } as never);
    vi.mocked(chatApi.getSessionMessages).mockResolvedValue({ data: { data: [] } } as never);
  });

  it('renders workspace chat shell and session list', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/workspaces/:workspaceId/chat" element={<ChatPage />} />
      </Routes>,
      { route: '/workspaces/ws-1/chat' },
    );

    await waitFor(() => {
      expect(chatApi.listWorkspaceSessions).toHaveBeenCalled();
    });

    expect(screen.getByRole('heading', { name: /workspace ai chat/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /ask your workspace/i })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /launch planning/i })).toBeInTheDocument();
  });
});
