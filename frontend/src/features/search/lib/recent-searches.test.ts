import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearRecentSearches,
  readRecentSearches,
  writeRecentSearch,
} from './recent-searches';

describe('recent-searches', () => {
  beforeEach(() => {
    clearRecentSearches('ws-1');
  });

  it('stores and reads recent searches', () => {
    writeRecentSearch('ws-1', 'authentication');
    writeRecentSearch('ws-1', 'launch date');

    expect(readRecentSearches('ws-1')).toEqual(['launch date', 'authentication']);
  });

  it('deduplicates recent searches', () => {
    writeRecentSearch('ws-1', 'vendor api');
    writeRecentSearch('ws-1', 'vendor api');

    expect(readRecentSearches('ws-1')).toEqual(['vendor api']);
  });
});
