export interface MemberName {
  id: string;
  displayName: string;
}

export function fuzzyMatchAssignee(
  suggestedName: string | null | undefined,
  members: MemberName[],
): string | null {
  if (!suggestedName?.trim()) {
    return null;
  }

  const normalized = suggestedName.toLowerCase().trim();

  const exact = members.find((member) => member.displayName.toLowerCase() === normalized);
  if (exact) {
    return exact.id;
  }

  const partial = members.find(
    (member) =>
      member.displayName.toLowerCase().includes(normalized) ||
      normalized.includes(member.displayName.toLowerCase()),
  );

  return partial?.id ?? null;
}
