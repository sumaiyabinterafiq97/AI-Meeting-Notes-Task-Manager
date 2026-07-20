import jwt from 'jsonwebtoken';
import { AuthProvider } from '@prisma/client';
import { env } from '../../config/env';
import { AppError, ErrorCodes } from '../../utils/errors';
import { authRepository } from './auth.repository';
import { AuthContext, AuthResult, AuthUserDto } from './auth.dto';
import { signAccessToken } from '../../lib/jwt';
import { generateOpaqueToken, hashToken } from '../../lib/token';
import { parseDurationToDate } from '../../lib/duration';
import { encryptToken } from '../calendar/utils/token-crypto';
import { metricsService, METRIC_NAMES } from '../observability';
import {
  getGoogleOAuthCredentials,
  GOOGLE_SIGNIN_SCOPES,
  useMockGoogleAuth,
} from './google-oauth.config';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

interface GoogleOAuthState {
  nonce: string;
  purpose: 'signin';
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

function toAuthUser(user: {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt?: Date;
}): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    ...(user.createdAt && { createdAt: user.createdAt }),
  };
}

export class GoogleAuthService {
  buildAuthorizationUrl(): string {
    if (useMockGoogleAuth()) {
      return `${env.FRONTEND_URL}/auth/google/callback?mock=1`;
    }

    const { clientId } = getGoogleOAuthCredentials();
    const state = jwt.sign(
      { nonce: generateOpaqueToken(), purpose: 'signin' } satisfies GoogleOAuthState,
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' },
    );

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
      response_type: 'code',
      scope: GOOGLE_SIGNIN_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  verifyState(state: string): GoogleOAuthState {
    try {
      const decoded = jwt.verify(state, env.JWT_ACCESS_SECRET) as GoogleOAuthState;
      if (decoded.purpose !== 'signin' || !decoded.nonce) {
        throw new Error('Invalid state');
      }
      return decoded;
    } catch {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid or expired OAuth state');
    }
  }

  async handleCallback(
    code: string,
    state: string,
    context: AuthContext = {},
  ): Promise<AuthResult> {
    this.verifyState(state);

    try {
      const tokens = await this.exchangeCode(code);
      const profile = await this.fetchUserInfo(tokens.access_token);
      const result = await this.upsertGoogleUser(profile, tokens, context);
      metricsService.incrementCounter(METRIC_NAMES.GOOGLE_OAUTH_SUCCESS, { flow: 'signin' });
      return result;
    } catch (error) {
      metricsService.incrementCounter(METRIC_NAMES.GOOGLE_OAUTH_FAILURE, { flow: 'signin' });
      throw error;
    }
  }

  async handleMockSignIn(context: AuthContext = {}): Promise<AuthResult> {
    if (!useMockGoogleAuth()) {
      throw new AppError(403, ErrorCodes.FORBIDDEN, 'Google auth mock is disabled');
    }

    const profile: GoogleUserInfo = {
      sub: 'mock-google-sub-001',
      email: 'google.user@example.com',
      email_verified: true,
      name: 'Google Mock User',
    };

    const tokens: GoogleTokenResponse = {
      access_token: 'mock-google-access',
      refresh_token: 'mock-google-refresh',
      expires_in: 3600,
    };

    const result = await this.upsertGoogleUser(profile, tokens, context);
    metricsService.incrementCounter(METRIC_NAMES.GOOGLE_OAUTH_SUCCESS, {
      flow: 'signin',
      mock: 'true',
    });
    return result;
  }

  private async exchangeCode(code: string): Promise<GoogleTokenResponse> {
    const { clientId, clientSecret } = getGoogleOAuthCredentials();
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new AppError(502, ErrorCodes.INTERNAL_ERROR, `Google token exchange failed: ${text}`);
    }

    return (await response.json()) as GoogleTokenResponse;
  }

  private async fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new AppError(502, ErrorCodes.INTERNAL_ERROR, 'Failed to fetch Google user profile');
    }

    const profile = (await response.json()) as GoogleUserInfo;
    if (!profile.sub || !profile.email) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Google profile missing email');
    }
    if (profile.email_verified === false) {
      throw new AppError(403, ErrorCodes.FORBIDDEN, 'Google email is not verified');
    }
    return profile;
  }

  private async upsertGoogleUser(
    profile: GoogleUserInfo,
    tokens: GoogleTokenResponse,
    context: AuthContext,
  ): Promise<AuthResult> {
    const email = profile.email.toLowerCase();
    const tokenFields = {
      googleAccessTokenEnc: encryptToken(tokens.access_token),
      googleRefreshTokenEnc: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
      googleTokenExpiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
    };

    let user = await authRepository.findUserByGoogleSub(profile.sub);

    if (user) {
      await authRepository.updateGoogleTokens(user.id, {
        googleAccessTokenEnc: tokenFields.googleAccessTokenEnc,
        ...(tokenFields.googleRefreshTokenEnc !== undefined && {
          googleRefreshTokenEnc: tokenFields.googleRefreshTokenEnc,
        }),
        googleTokenExpiresAt: tokenFields.googleTokenExpiresAt,
      });
      user = (await authRepository.findUserById(user.id))!;
    } else {
      const byEmail = await authRepository.findUserByEmail(email);

      if (byEmail) {
        if (byEmail.googleSub && byEmail.googleSub !== profile.sub) {
          throw new AppError(
            409,
            ErrorCodes.CONFLICT,
            'This email is linked to a different Google account. Sign in with password or contact support.',
          );
        }

        // Safe link: Google verified ownership of the same email as an existing password account
        user = await authRepository.linkGoogleAccount(byEmail.id, {
          googleSub: profile.sub,
          googleEmail: email,
          avatarUrl: profile.picture ?? byEmail.avatarUrl,
          authProvider: byEmail.passwordHash ? AuthProvider.BOTH : AuthProvider.GOOGLE,
          googleAccessTokenEnc: tokenFields.googleAccessTokenEnc,
          googleRefreshTokenEnc: tokenFields.googleRefreshTokenEnc ?? null,
          googleTokenExpiresAt: tokenFields.googleTokenExpiresAt,
        });
      } else {
        user = await authRepository.createGoogleUser({
          email,
          displayName: profile.name?.trim() || email.split('@')[0] || 'Google User',
          googleSub: profile.sub,
          googleEmail: email,
          avatarUrl: profile.picture,
          googleAccessTokenEnc: tokenFields.googleAccessTokenEnc,
          googleRefreshTokenEnc: tokenFields.googleRefreshTokenEnc ?? null,
          googleTokenExpiresAt: tokenFields.googleTokenExpiresAt,
        });
      }
    }

    const tokensOut = await this.issueTokenPair(user.id, user.email, context);
    return {
      user: toAuthUser(user),
      accessToken: tokensOut.accessToken,
      refreshToken: tokensOut.refreshToken,
    };
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    context: AuthContext,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = signAccessToken({ id: userId, email });
    const refreshToken = generateOpaqueToken();
    const tokenHash = hashToken(refreshToken);
    const expiresAt = parseDurationToDate(env.JWT_REFRESH_EXPIRES_IN);

    await authRepository.createRefreshToken({
      userId,
      tokenHash,
      expiresAt,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    });

    return { accessToken, refreshToken };
  }
}

export const googleAuthService = new GoogleAuthService();
