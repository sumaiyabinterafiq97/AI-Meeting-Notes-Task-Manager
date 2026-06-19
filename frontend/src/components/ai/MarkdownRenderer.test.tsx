import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from '@/components/ai/MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('renders markdown content safely', () => {
    render(<MarkdownRenderer content={'## Summary\n\nShip **Friday**.'} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Summary' })).toBeInTheDocument();
    expect(screen.getByText('Friday')).toBeInTheDocument();
  });

  it('sanitizes unsafe html', () => {
    const { container } = render(
      <MarkdownRenderer content={'<script>alert("xss")</script>\n\nSafe text'} />,
    );

    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('Safe text')).toBeInTheDocument();
  });
});
