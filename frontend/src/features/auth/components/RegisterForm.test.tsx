import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { renderWithProviders } from '@/test/render-with-providers';
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

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('No session'));
  });

  it('renders registration form', async () => {
    renderWithProviders(<RegisterForm />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('validates password requirements', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/display name/i), 'Alex');
    await user.type(screen.getByLabelText(/^email$/i), 'alex@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'short');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
  });
});
