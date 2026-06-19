import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatEmptyState } from '@/features/chat/components/ChatEmptyState';
import { renderWithProviders } from '@/test/render-with-providers';

describe('ChatEmptyState', () => {
  it('renders example prompts', () => {
    renderWithProviders(<ChatEmptyState onExampleClick={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /ask about this meeting/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /key decisions/i })).toBeInTheDocument();
  });

  it('calls onExampleClick when an example is selected', async () => {
    const user = userEvent.setup();
    const onExampleClick = vi.fn();

    renderWithProviders(<ChatEmptyState onExampleClick={onExampleClick} />);

    await user.click(screen.getByRole('button', { name: /summarize the action items/i }));

    expect(onExampleClick).toHaveBeenCalledWith('Summarize the action items');
  });
});
