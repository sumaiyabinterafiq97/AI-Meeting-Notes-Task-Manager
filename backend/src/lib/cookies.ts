import { CookieOptions } from 'express';
import { env } from '../config/env';
import { parseDurationToMs } from './duration';

export const REFRESH_TOKEN_COOKIE = 'refreshToken';

export function getRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth/refresh',
    maxAge: parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN),
  };
}

export function getClearRefreshCookieOptions(): CookieOptions {
  return {
    ...getRefreshCookieOptions(),
    maxAge: 0,
  };
}
