import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { KnowledgePage } from '@/features/knowledge/pages/KnowledgePage';
import { renderWithProviders } from '@/test/render-with-providers';
import { authApi } from '@/features/auth/services/auth-api';
import { knowledgeApi } from '@/features/knowledge/services/knowledge-api';

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

vi.mock('@/features/knowledge/services/knowledge-api', () => ({
  knowledgeApi: {
    list: vi.fn(),
    getById: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
};

const mockEntry = {
  id: 'entry-1',
  workspaceId: 'ws-1',
  sourceMeetingId: 'meeting-1',
  entityType: 'DECISION' as const,
  title: 'Ship Friday',
  content: 'Team agreed to ship on Friday.',
  confidence: 0.9,
  createdAt: '2026-06-10T10:00:00.000Z',
  updatedAt: '2026-06-10T10:00:00.000Z',
};

describe('KnowledgePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.refresh).mockResolvedValue({ data: { accessToken: 'token' } } as never);
    vi.mocked(authApi.getMe).mockResolvedValue({ data: mockUser } as never);
    vi.mocked(knowledgeApi.list).mockResolvedValue({ data: { data: [mockEntry] } } as never);
    vi.mocked(knowledgeApi.getById).mockResolvedValue({ data: mockEntry } as never);
  });

  it('renders knowledge list and decision timeline', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/workspaces/:workspaceId/knowledge" element={<KnowledgePage />} />
      </Routes>,
      { route: '/workspaces/ws-1/knowledge' },
    );

    await waitFor(() => {
      expect(knowledgeApi.list).toHaveBeenCalled();
    });

    expect(screen.getByRole('heading', { name: /knowledge base/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /ship friday/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /decision timeline/i })).toBeInTheDocument();
  });
});
