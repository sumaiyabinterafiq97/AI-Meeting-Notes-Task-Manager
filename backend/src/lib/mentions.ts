export interface MentionMember {
  id: string;
  email: string;
  displayName: string;
}

const MENTION_PATTERN = /@(\S+)/g;

export function parseMentions(
  content: string,
  members: MentionMember[],
  authorId: string,
): string[] {
  const mentioned = new Set<string>();

  for (const match of content.matchAll(MENTION_PATTERN)) {
    const token = match[1].toLowerCase();

    for (const member of members) {
      if (member.id === authorId) {
        continue;
      }

      const email = member.email.toLowerCase();
      const emailLocal = email.split('@')[0];
      const displayLower = member.displayName.toLowerCase();
      const displayCompact = displayLower.replace(/\s+/g, '');

      if (
        email === token ||
        emailLocal === token ||
        displayLower === token ||
        displayCompact === token
      ) {
        mentioned.add(member.id);
      }
    }
  }

  return [...mentioned];
}
