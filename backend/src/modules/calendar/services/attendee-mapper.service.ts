import type { CalendarAttendee } from '../types/calendar.types';

export interface WorkspaceMemberRef {
  email: string;
  displayName: string;
}

export function mapAttendeesToWorkspaceMembers(
  eventAttendees: CalendarAttendee[],
  members: WorkspaceMemberRef[],
): string[] {
  const emailToName = new Map(
    members.map((member) => [member.email.toLowerCase(), member.displayName]),
  );

  const mapped = eventAttendees
    .map((attendee) => {
      const email = attendee.email?.toLowerCase();
      if (email && emailToName.has(email)) {
        return emailToName.get(email)!;
      }
      return attendee.displayName ?? attendee.email ?? null;
    })
    .filter((value): value is string => Boolean(value));

  return [...new Set(mapped)];
}

export function extractAttendeeEmails(eventAttendees: CalendarAttendee[]): string[] {
  return [
    ...new Set(
      eventAttendees
        .map((attendee) => attendee.email?.toLowerCase())
        .filter((email): email is string => Boolean(email)),
    ),
  ];
}

export function durationMinutesFromRange(start: Date, end: Date | null): number | null {
  if (!end) {
    return null;
  }
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  return minutes > 0 ? minutes : null;
}
