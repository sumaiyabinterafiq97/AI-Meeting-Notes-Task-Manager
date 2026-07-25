import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MobileBottomNav } from '@/layouts/MobileBottomNav';

function renderBottomNav(route = '/workspaces/ws-1/meetings') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <MobileBottomNav workspaceId="ws-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MobileBottomNav', () => {
  it('renders meetings-first navigation tabs', () => {
    renderBottomNav();

    expect(screen.getByRole('link', { name: /meetings/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^chat$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument();
  });

  it('marks the active tab', () => {
    renderBottomNav('/workspaces/ws-1/settings');

    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('aria-current', 'page');
  });
});
