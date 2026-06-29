import { Prisma } from '@prisma/client';

export function buildMeetingDateFilter(dateFrom?: string, dateTo?: string) {
  const fromFilter = dateFrom
    ? Prisma.sql`AND (metadata->>'meetingDate')::timestamptz >= ${dateFrom}::timestamptz`
    : Prisma.empty;

  const toFilter = dateTo
    ? Prisma.sql`AND (metadata->>'meetingDate')::timestamptz <= ${dateTo}::timestamptz`
    : Prisma.empty;

  return { fromFilter, toFilter };
}
