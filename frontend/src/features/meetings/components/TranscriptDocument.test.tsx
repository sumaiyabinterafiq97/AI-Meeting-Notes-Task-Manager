import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TranscriptDocument } from './TranscriptDocument';

const transcript = {
  id: 'tr-1',
  content: 'Hello team. We agreed to ship on Friday.',
  sourceFormat: 'text' as const,
  charCount: 42,
  uploadedAt: '2026-06-16T12:00:00.000Z',
};

describe('TranscriptDocument', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:transcript'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders transcript text and download actions', async () => {
    const user = userEvent.setup();
    render(<TranscriptDocument title="Sprint Planning" transcript={transcript} />);

    expect(screen.getByText(/hello team/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download \.txt/i })).toBeInTheDocument();

    const click = vi.fn();
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return { href: '', download: '', click } as unknown as HTMLAnchorElement;
      }
      return realCreateElement(tagName);
    });

    await user.click(screen.getByRole('button', { name: /download \.md/i }));
    expect(click).toHaveBeenCalled();
  });
});
