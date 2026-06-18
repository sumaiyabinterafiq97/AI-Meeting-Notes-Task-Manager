import { describe, it, expect } from 'vitest';
import {
  filterMembersForMention,
  getMentionContext,
  insertMention,
  memberToMentionToken,
} from './mentions';

const members = [
  { userId: '1', displayName: 'Alex Johnson', email: 'alex@example.com' },
  { userId: '2', displayName: 'Sam Lee', email: 'sam.lee@example.com' },
];

describe('mentions', () => {
  it('converts display names to compact mention tokens', () => {
    expect(memberToMentionToken('Alex Johnson')).toBe('AlexJohnson');
  });

  it('filters members by display name, email, or local part', () => {
    expect(filterMembersForMention(members, 'alex')).toHaveLength(1);
    expect(filterMembersForMention(members, 'sam.lee')).toHaveLength(1);
    expect(filterMembersForMention(members, 'johnson')).toHaveLength(1);
  });

  it('excludes the current user from suggestions', () => {
    expect(filterMembersForMention(members, '', '1')).toHaveLength(1);
    expect(filterMembersForMention(members, '', '1')[0].userId).toBe('2');
  });

  it('detects mention context at the cursor', () => {
    expect(getMentionContext('Hello @al', 9)).toEqual({ query: 'al', start: 6 });
    expect(getMentionContext('Hello world', 11)).toBeNull();
  });

  it('inserts a mention token at the cursor', () => {
    const result = insertMention('Hello @al', 6, 9, 'AlexJohnson');
    expect(result).toEqual({
      nextValue: 'Hello @AlexJohnson ',
      nextCursor: 19,
    });
  });
});
