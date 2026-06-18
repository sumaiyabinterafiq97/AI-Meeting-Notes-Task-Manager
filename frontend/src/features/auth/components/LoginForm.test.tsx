import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/features/auth/components/LoginForm';
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

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('No session'));
  });

  it('renders sign in form', async () => {
    renderWithProviders(<LoginForm />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it('shows API error on failed login', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockRejectedValue({
      response: {
        data: {
          error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
        },
      },
    });

    renderWithProviders(<LoginForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/^email$/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i);
  });
});
