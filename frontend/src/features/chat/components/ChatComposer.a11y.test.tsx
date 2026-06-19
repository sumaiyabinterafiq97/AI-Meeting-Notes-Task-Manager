import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ChatComposer } from '@/features/chat/components/ChatComposer';

describe('ChatComposer accessibility', () => {
  it('has no detectable a11y violations', async () => {
    const { container } = render(
      <ChatComposer onSubmit={() => undefined} placeholder="Ask a question…" />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
