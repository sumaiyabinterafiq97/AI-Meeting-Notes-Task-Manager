export interface MentionableMember {
  userId: string;
  displayName: string;
  email: string;
}

export function memberToMentionToken(displayName: string): string {
  return displayName.replace(/\s+/g, '');
}

export function filterMembersForMention(
  members: MentionableMember[],
  query: string,
  excludeUserId?: string,
): MentionableMember[] {
  const normalized = query.toLowerCase();

  const eligible = excludeUserId
    ? members.filter((member) => member.userId !== excludeUserId)
    : members;

  if (!normalized) {
    return eligible;
  }

  return eligible.filter((member) => {
    const email = member.email.toLowerCase();
    const emailLocal = email.split('@')[0];
    const displayLower = member.displayName.toLowerCase();
    const displayCompact = memberToMentionToken(member.displayName).toLowerCase();

    return (
      displayLower.includes(normalized) ||
      displayCompact.includes(normalized) ||
      emailLocal.includes(normalized) ||
      email.includes(normalized)
    );
  });
}

export function getMentionContext(
  value: string,
  cursorPosition: number,
): { query: string; start: number } | null {
  const beforeCursor = value.slice(0, cursorPosition);
  const match = /(^|\s)@([^\s@]*)$/.exec(beforeCursor);

  if (!match) {
    return null;
  }

  return {
    query: match[2],
    start: beforeCursor.length - match[2].length - 1,
  };
}

export function insertMention(
  value: string,
  start: number,
  cursorPosition: number,
  token: string,
): { nextValue: string; nextCursor: number } {
  const mention = `@${token} `;
  const nextValue = `${value.slice(0, start)}${mention}${value.slice(cursorPosition)}`;
  const nextCursor = start + mention.length;

  return { nextValue, nextCursor };
}
