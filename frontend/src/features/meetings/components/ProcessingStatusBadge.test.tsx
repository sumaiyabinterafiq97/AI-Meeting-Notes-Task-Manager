import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProcessingStatusBadge } from '@/features/meetings/components/ProcessingStatusBadge';

describe('ProcessingStatusBadge', () => {
  it('renders status label', () => {
    render(<ProcessingStatusBadge status="PROCESSING" />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('renders ready status', () => {
    render(<ProcessingStatusBadge status="READY" />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });
});
