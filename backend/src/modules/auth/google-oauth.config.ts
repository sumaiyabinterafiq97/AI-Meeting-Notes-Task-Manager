import { env } from '../../config/env';
import { AppError, ErrorCodes } from '../../utils/errors';

export interface GoogleOAuthCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * One Google Cloud OAuth client for Sign-In + Calendar/Meet.
 * GOOGLE_OAUTH_* takes precedence; falls back to GOOGLE_CALENDAR_*.
 */
export function getGoogleOAuthCredentials(): GoogleOAuthCredentials {
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID ?? env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET ?? env.GOOGLE_CALENDAR_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new AppError(
      503,
      ErrorCodes.INTERNAL_ERROR,
      'Google OAuth is not configured (set GOOGLE_OAUTH_CLIENT_ID/SECRET or GOOGLE_CALENDAR_*)',
    );
  }

  return { clientId, clientSecret };
}

export function useMockGoogleAuth(): boolean {
  return env.GOOGLE_AUTH_USE_MOCK || env.AI_USE_MOCK || env.CALENDAR_USE_MOCK;
}

/** Identity + Calendar events (Meet via conferenceData) */
export const GOOGLE_SIGNIN_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

export const GOOGLE_CALENDAR_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');
