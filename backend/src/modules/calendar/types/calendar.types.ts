import type { CalendarProvider } from '@prisma/client';

export interface CalendarAttendee {
  email?: string;
  displayName?: string;
}

export interface CalendarEvent {
  externalEventId: string;
  title: string;
  start: Date;
  end: Date | null;
  description?: string;
  attendees: CalendarAttendee[];
  location?: string;
  isCancelled?: boolean;
}

export interface CalendarEventListOptions {
  timeMin: Date;
  timeMax: Date;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  accountEmail?: string;
}

export interface ICalendarProvider {
  readonly provider: CalendarProvider;
  buildAuthorizationUrl(state: string): string;
  exchangeCodeForTokens(code: string): Promise<OAuthTokens>;
  refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;
  listEvents(accessToken: string, options: CalendarEventListOptions): Promise<CalendarEvent[]>;
}

export interface CalendarConnectionRecord {
  id: string;
  workspaceId: string;
  provider: CalendarProvider;
  accessTokenEnc: string;
  refreshTokenEnc: string | null;
  tokenExpiresAt: Date | null;
  calendarId: string | null;
}

export interface SyncConnectionResult {
  connectionId: string;
  eventsFetched: number;
  meetingsCreated: number;
  meetingsUpdated: number;
  remindersSent: number;
}

export interface CalendarConnectionDto {
  id: string;
  workspaceId: string;
  provider: CalendarProvider;
  status: string;
  accountEmail: string | null;
  syncEnabled: boolean;
  lastSyncAt: Date | null;
  lastSyncError: string | null;
  connectedById: string;
  createdAt: Date;
}

export interface CalendarSyncStatusDto {
  workspaceId: string;
  connections: CalendarConnectionDto[];
  lastSyncAt: Date | null;
}
