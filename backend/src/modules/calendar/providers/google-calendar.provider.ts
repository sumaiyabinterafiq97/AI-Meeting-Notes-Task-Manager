import { env } from '../../../config/env';
import { AppError, ErrorCodes } from '../../../utils/errors';
import type {
  CalendarEvent,
  CalendarEventListOptions,
  ICalendarProvider,
  OAuthTokens,
} from '../types/calendar.types';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

function requireGoogleConfig(): { clientId: string; clientSecret: string; redirectUri: string } {
  if (!env.GOOGLE_CALENDAR_CLIENT_ID || !env.GOOGLE_CALENDAR_CLIENT_SECRET) {
    throw new AppError(
      503,
      ErrorCodes.INTERNAL_ERROR,
      'Google Calendar OAuth is not configured',
    );
  }
  return {
    clientId: env.GOOGLE_CALENDAR_CLIENT_ID,
    clientSecret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
    redirectUri: env.GOOGLE_CALENDAR_REDIRECT_URI,
  };
}

async function postToken(body: URLSearchParams): Promise<OAuthTokens> {
  const { clientId, clientSecret, redirectUri } = requireGoogleConfig();
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  if (!body.has('redirect_uri')) {
    body.set('redirect_uri', redirectUri);
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(502, ErrorCodes.INTERNAL_ERROR, `Google token exchange failed: ${text}`);
  }

  const json = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_in
      ? new Date(Date.now() + json.expires_in * 1000)
      : undefined,
  };
}

export class GoogleCalendarProvider implements ICalendarProvider {
  readonly provider = 'GOOGLE' as const;

  buildAuthorizationUrl(state: string): string {
    const { clientId, redirectUri } = requireGoogleConfig();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
    });
    const tokens = await postToken(body);
    tokens.accountEmail = await this.fetchAccountEmail(tokens.accessToken);
    return tokens;
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });
    return postToken(body);
  }

  async listEvents(
    accessToken: string,
    options: CalendarEventListOptions,
  ): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      timeMin: options.timeMin.toISOString(),
      timeMax: options.timeMax.toISOString(),
      maxResults: '250',
    });

    const response = await fetch(`${GOOGLE_EVENTS_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new AppError(502, ErrorCodes.INTERNAL_ERROR, `Google Calendar API failed: ${text}`);
    }

    const json = (await response.json()) as {
      items?: Array<{
        id: string;
        status?: string;
        summary?: string;
        description?: string;
        location?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
        attendees?: Array<{ email?: string; displayName?: string }>;
      }>;
    };

    return (json.items ?? [])
      .filter((item) => item.status !== 'cancelled')
      .map((item) => ({
        externalEventId: item.id,
        title: item.summary ?? 'Untitled meeting',
        start: new Date(item.start?.dateTime ?? item.start?.date ?? Date.now()),
        end: item.end?.dateTime || item.end?.date
          ? new Date(item.end.dateTime ?? item.end.date!)
          : null,
        description: item.description,
        location: item.location,
        attendees: (item.attendees ?? []).map((a) => ({
          email: a.email,
          displayName: a.displayName,
        })),
        isCancelled: item.status === 'cancelled',
      }));
  }

  private async fetchAccountEmail(accessToken: string): Promise<string | undefined> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      return undefined;
    }
    const json = (await response.json()) as { email?: string };
    return json.email;
  }
}

export const googleCalendarProvider = new GoogleCalendarProvider();
