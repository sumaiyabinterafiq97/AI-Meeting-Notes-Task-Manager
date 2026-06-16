import { parseMentions } from '../../src/lib/mentions';

describe('parseMentions', () => {
  const members = [
    { id: 'user-1', email: 'alice@example.com', displayName: 'Alice Smith' },
    { id: 'user-2', email: 'bob@example.com', displayName: 'Bob Jones' },
  ];

  it('matches email local part', () => {
    const result = parseMentions('Please check @bob', members, 'user-1');
    expect(result).toEqual(['user-2']);
  });

  it('matches display name without spaces', () => {
    const result = parseMentions('cc @alicesmith', members, 'user-2');
    expect(result).toEqual(['user-1']);
  });

  it('excludes the author from mentions', () => {
    const result = parseMentions('@alice self mention', members, 'user-1');
    expect(result).toEqual([]);
  });

  it('matches full email', () => {
    const result = parseMentions('ping @bob@example.com', members, 'user-1');
    expect(result).toEqual(['user-2']);
  });
});
