import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MobileNav } from '@/layouts/MobileNav';

function renderMobileNav(route = '/workspaces/ws-1/dashboard') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <MobileNav workspaceId="ws-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MobileNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens navigation menu with workspace links', async () => {
    const user = userEvent.setup();
    renderMobileNav();

    await user.click(screen.getByRole('button', { name: /open navigation menu/i }));

    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^chat$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^insights$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^search$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /meetings/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /tasks/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /reports/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /knowledge/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /all workspaces/i })).toBeInTheDocument();
  });

  it('marks the active route', async () => {
    const user = userEvent.setup();
    renderMobileNav('/workspaces/ws-1/tasks');

    await user.click(screen.getByRole('button', { name: /open navigation menu/i }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^tasks$/i })).toHaveAttribute('aria-current', 'page');
    });
  });
});
