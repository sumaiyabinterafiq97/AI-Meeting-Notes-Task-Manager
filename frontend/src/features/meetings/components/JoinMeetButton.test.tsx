import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { JoinMeetButton } from '@/features/meetings/components/JoinMeetButton';

describe('JoinMeetButton', () => {
  it('renders Join link when meetUrl is set', () => {
    render(
      <MemoryRouter>
        <JoinMeetButton workspaceId="ws-1" meetUrl="https://meet.google.com/abc-defg-hij" />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /join google meet/i });
    expect(link).toHaveAttribute('href', 'https://meet.google.com/abc-defg-hij');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows connect guidance when meetUrl is missing', () => {
    render(
      <MemoryRouter>
        <JoinMeetButton workspaceId="ws-1" meetUrl={null} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /join google meet/i })).toBeDisabled();
    expect(screen.getByRole('link', { name: /connect google calendar/i })).toBeInTheDocument();
  });
});
