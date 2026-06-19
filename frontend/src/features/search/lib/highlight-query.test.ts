import { describe, it, expect } from 'vitest';
import { highlightQueryInText } from './highlight-query';

describe('highlight-query', () => {
  it('wraps matching terms in emphasis tags', () => {
    const result = highlightQueryInText('OAuth authentication flow', 'authentication');
    expect(result).toContain('<em>authentication</em>');
  });

  it('escapes html in excerpts', () => {
    const result = highlightQueryInText('<script>alert(1)</script>', 'script');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;');
    expect(result).toContain('<em>script</em>');
  });
});
