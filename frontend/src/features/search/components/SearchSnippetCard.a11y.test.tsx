import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { SearchSnippetCard } from '@/features/search/components/SearchSnippetCard';
import type { SearchSnippetResult } from '@/features/search/types/search.types';

const snippet: SearchSnippetResult = {
  meetingId: 'meeting-1',
  meetingTitle: 'Sprint Planning',
  excerpt: 'Discussed authentication rollout timeline.',
  field: 'summary',
  matchType: 'semantic',
  relevanceScore: 0.82,
  sourceType: 'summary',
};

describe('SearchSnippetCard accessibility', () => {
  it('has no detectable a11y violations', async () => {
    const { container } = render(
      <SearchSnippetCard snippet={snippet} query="authentication" onClick={() => undefined} />,
    );

    expect(screen.getByRole('button', { name: /sprint planning/i })).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
