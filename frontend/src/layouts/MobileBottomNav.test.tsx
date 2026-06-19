import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MobileBottomNav } from '@/layouts/MobileBottomNav';

function renderBottomNav(route = '/workspaces/ws-1/chat') {
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
  it('renders AI-first navigation tabs', () => {
    renderBottomNav();

    expect(screen.getByRole('link', { name: /^chat$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^search$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /meetings/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('marks the active tab', () => {
    renderBottomNav('/workspaces/ws-1/search');

    expect(screen.getByRole('link', { name: /^search$/i })).toHaveAttribute('aria-current', 'page');
  });
});
