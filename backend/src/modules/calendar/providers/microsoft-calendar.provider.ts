import { env } from '../../../config/env';
import { AppError, ErrorCodes } from '../../../utils/errors';
import type {
  CalendarEvent,
  CalendarEventListOptions,
  ICalendarProvider,
  OAuthTokens,
} from '../types/calendar.types';

const AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const GRAPH_EVENTS_URL = 'https://graph.microsoft.com/v1.0/me/events';

const SCOPES = ['offline_access', 'Calendars.Read', 'User.Read'].join(' ');

function requireMicrosoftConfig(): { clientId: string; clientSecret: string; redirectUri: string } {
  if (!env.MICROSOFT_CALENDAR_CLIENT_ID || !env.MICROSOFT_CALENDAR_CLIENT_SECRET) {
    throw new AppError(
      503,
      ErrorCodes.INTERNAL_ERROR,
      'Microsoft Calendar OAuth is not configured',
    );
  }
  return {
    clientId: env.MICROSOFT_CALENDAR_CLIENT_ID,
    clientSecret: env.MICROSOFT_CALENDAR_CLIENT_SECRET,
    redirectUri: env.MICROSOFT_CALENDAR_REDIRECT_URI,
  };
}

async function postToken(body: URLSearchParams): Promise<OAuthTokens> {
  const { clientId, clientSecret, redirectUri } = requireMicrosoftConfig();
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  if (!body.has('redirect_uri')) {
    body.set('redirect_uri', redirectUri);
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(502, ErrorCodes.INTERNAL_ERROR, `Microsoft token exchange failed: ${text}`);
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

export class MicrosoftCalendarProvider implements ICalendarProvider {
  readonly provider = 'MICROSOFT' as const;

  buildAuthorizationUrl(state: string): string {
    const { clientId, redirectUri } = requireMicrosoftConfig();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
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
    const filter = `start/dateTime ge '${options.timeMin.toISOString()}' and end/dateTime le '${options.timeMax.toISOString()}'`;
    const params = new URLSearchParams({
      $filter: filter,
      $orderby: 'start/dateTime',
      $top: '250',
    });

    const response = await fetch(`${GRAPH_EVENTS_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new AppError(502, ErrorCodes.INTERNAL_ERROR, `Microsoft Graph API failed: ${text}`);
    }

    const json = (await response.json()) as {
      value?: Array<{
        id: string;
        subject?: string;
        bodyPreview?: string;
        location?: { displayName?: string };
        isCancelled?: boolean;
        start?: { dateTime: string };
        end?: { dateTime: string };
        attendees?: Array<{
          emailAddress?: { address?: string; name?: string };
        }>;
      }>;
    };

    return (json.value ?? [])
      .filter((item) => !item.isCancelled)
      .map((item) => ({
        externalEventId: item.id,
        title: item.subject ?? 'Untitled meeting',
        start: new Date(item.start?.dateTime ?? Date.now()),
        end: item.end?.dateTime ? new Date(item.end.dateTime) : null,
        description: item.bodyPreview,
        location: item.location?.displayName,
        attendees: (item.attendees ?? []).map((a) => ({
          email: a.emailAddress?.address,
          displayName: a.emailAddress?.name,
        })),
        isCancelled: item.isCancelled,
      }));
  }

  private async fetchAccountEmail(accessToken: string): Promise<string | undefined> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      return undefined;
    }
    const json = (await response.json()) as { mail?: string; userPrincipalName?: string };
    return json.mail ?? json.userPrincipalName;
  }
}

export const microsoftCalendarProvider = new MicrosoftCalendarProvider();
