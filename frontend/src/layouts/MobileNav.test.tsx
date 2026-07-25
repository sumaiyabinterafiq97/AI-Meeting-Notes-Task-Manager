import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MobileNav } from '@/layouts/MobileNav';

function renderMobileNav(route = '/workspaces/ws-1/meetings') {
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

  it('opens navigation menu with minimal workspace links', async () => {
    const user = userEvent.setup();
    renderMobileNav();

    await user.click(screen.getByRole('button', { name: /open navigation menu/i }));

    expect(screen.getByRole('link', { name: /meetings/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /all workspaces/i })).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^chat$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /tasks/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /reports/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /knowledge/i })).not.toBeInTheDocument();
  });

  it('marks the active route', async () => {
    const user = userEvent.setup();
    renderMobileNav('/workspaces/ws-1/settings');

    await user.click(screen.getByRole('button', { name: /open navigation menu/i }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute(
        'aria-current',
        'page',
      );
    });
  });
});
