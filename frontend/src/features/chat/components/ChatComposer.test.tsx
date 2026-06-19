import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatComposer } from '@/features/chat/components/ChatComposer';
import { renderWithProviders } from '@/test/render-with-providers';

describe('ChatComposer', () => {
  it('submits a message', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithProviders(<ChatComposer onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/chat message/i), 'What were the decisions?');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSubmit).toHaveBeenCalledWith('What were the decisions?');
  });

  it('shows stop control while streaming', () => {
    renderWithProviders(<ChatComposer onSubmit={vi.fn()} isStreaming onCancel={vi.fn()} />);

    expect(screen.getByRole('button', { name: /stop generating/i })).toBeInTheDocument();
  });
});
