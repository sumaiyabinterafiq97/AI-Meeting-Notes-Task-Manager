import { fuzzyMatchAssignee } from '../../src/lib/fuzzy-match';

describe('fuzzyMatchAssignee', () => {
  const members = [
    { id: 'user-1', displayName: 'Alex Johnson' },
    { id: 'user-2', displayName: 'Jordan Lee' },
  ];

  it('returns null for empty suggested name', () => {
    expect(fuzzyMatchAssignee(null, members)).toBeNull();
    expect(fuzzyMatchAssignee('  ', members)).toBeNull();
  });

  it('matches exact display name', () => {
    expect(fuzzyMatchAssignee('Alex Johnson', members)).toBe('user-1');
  });

  it('matches partial display name', () => {
    expect(fuzzyMatchAssignee('jordan', members)).toBe('user-2');
  });

  it('returns null when no match found', () => {
    expect(fuzzyMatchAssignee('Unknown Person', members)).toBeNull();
  });
});
