import type { CalendarProvider } from '@prisma/client';
import type {
  CalendarEvent,
  CalendarEventListOptions,
  ICalendarProvider,
  OAuthTokens,
} from '../types/calendar.types';

export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    externalEventId: 'mock-google-standup-001',
    title: 'Daily Standup',
    start: new Date(Date.now() + 24 * 60 * 60 * 1000),
    end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
    description: 'Team sync on sprint progress.',
    attendees: [
      { email: 'alex@example.com', displayName: 'Alex' },
      { email: 'jordan@example.com', displayName: 'Jordan' },
    ],
  },
  {
    externalEventId: 'mock-google-planning-002',
    title: 'Sprint Planning',
    start: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
    description: 'Plan next sprint goals and capacity.',
    attendees: [{ email: 'alex@example.com', displayName: 'Alex' }],
  },
  {
    externalEventId: 'mock-google-retro-past',
    title: 'Sprint Retrospective',
    start: new Date(Date.now() - 2 * 60 * 60 * 1000),
    end: new Date(Date.now() - 60 * 60 * 1000),
    description: 'Review what went well and improvements.',
    attendees: [{ email: 'jordan@example.com', displayName: 'Jordan' }],
  },
];

export class MockCalendarProvider implements ICalendarProvider {
  readonly provider: CalendarProvider;

  constructor(provider: CalendarProvider) {
    this.provider = provider;
  }

  buildAuthorizationUrl(_state: string): string {
    return 'mock://calendar/oauth';
  }

  async exchangeCodeForTokens(_code: string): Promise<OAuthTokens> {
    return {
      accessToken: `mock-access-${this.provider.toLowerCase()}`,
      refreshToken: `mock-refresh-${this.provider.toLowerCase()}`,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      accountEmail: `calendar-${this.provider.toLowerCase()}@example.com`,
    };
  }

  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokens> {
    return this.exchangeCodeForTokens('refresh');
  }

  async listEvents(
    _accessToken: string,
    options: CalendarEventListOptions,
  ): Promise<CalendarEvent[]> {
    return MOCK_CALENDAR_EVENTS.filter(
      (event) => event.start >= options.timeMin && event.start <= options.timeMax,
    );
  }
}

export const mockGoogleCalendarProvider = new MockCalendarProvider('GOOGLE');
export const mockMicrosoftCalendarProvider = new MockCalendarProvider('MICROSOFT');
