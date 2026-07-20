import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { googleAuthService } from './google-auth.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  AuthContext,
} from './auth.dto';
import {
  REFRESH_TOKEN_COOKIE,
  getRefreshCookieOptions,
  getClearRefreshCookieOptions,
} from '../../lib/cookies';
import { AppError, ErrorCodes } from '../../utils/errors';
import { env } from '../../config/env';
import { useMockGoogleAuth } from './google-oauth.config';

function getAuthContext(req: Request): AuthContext {
  return {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  };
}

function redirectWithSession(
  res: Response,
  refreshToken: string,
  query: Record<string, string> = {},
): void {
  const params = new URLSearchParams({ auth: 'google', ...query });
  res
    .cookie(REFRESH_TOKEN_COOKIE, refreshToken, getRefreshCookieOptions())
    .redirect(`${env.FRONTEND_URL}/auth/google/callback?${params.toString()}`);
}

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body as RegisterDto;
      const result = await authService.register(data, getAuthContext(req));

      res
        .cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, getRefreshCookieOptions())
        .status(201)
        .json({
          user: result.user,
          accessToken: result.accessToken,
        });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body as LoginDto;
      const result = await authService.login(data, getAuthContext(req));

      res
        .cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, getRefreshCookieOptions())
        .status(200)
        .json({
          user: result.user,
          accessToken: result.accessToken,
        });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
      await authService.logout(refreshToken);
      res.clearCookie(REFRESH_TOKEN_COOKIE, getClearRefreshCookieOptions()).status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
      if (!refreshToken) {
        next(new AppError(401, ErrorCodes.UNAUTHORIZED, 'Refresh token required'));
        return;
      }

      const result = await authService.refresh(refreshToken, getAuthContext(req));

      res
        .cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, getRefreshCookieOptions())
        .status(200)
        .json({ accessToken: result.accessToken });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body as ForgotPasswordDto;
      const result = await authService.forgotPassword(data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body as ResetPasswordDto;
      const result = await authService.resetPassword(data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        next(new AppError(401, ErrorCodes.UNAUTHORIZED, 'Authentication required'));
        return;
      }

      const user = await authService.getMe(userId);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  async googleStart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (useMockGoogleAuth()) {
        const result = await googleAuthService.handleMockSignIn(getAuthContext(req));
        redirectWithSession(res, result.refreshToken, { mock: '1' });
        return;
      }

      const url = googleAuthService.buildAuthorizationUrl();
      res.redirect(url);
    } catch (error) {
      next(error);
    }
  }

  async googleCallback(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const errorParam = typeof req.query.error === 'string' ? req.query.error : undefined;
      if (errorParam) {
        res.redirect(
          `${env.FRONTEND_URL}/login?error=${encodeURIComponent('Google sign-in was cancelled')}`,
        );
        return;
      }

      if (useMockGoogleAuth() && req.query.mock === '1') {
        const result = await googleAuthService.handleMockSignIn(getAuthContext(req));
        redirectWithSession(res, result.refreshToken, { mock: '1' });
        return;
      }

      const code = typeof req.query.code === 'string' ? req.query.code : undefined;
      const state = typeof req.query.state === 'string' ? req.query.state : undefined;
      if (!code || !state) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Missing OAuth code or state');
      }

      const result = await googleAuthService.handleCallback(code, state, getAuthContext(req));
      redirectWithSession(res, result.refreshToken);
    } catch (error) {
      const message = error instanceof AppError ? error.message : 'Google sign-in failed';
      res.redirect(`${env.FRONTEND_URL}/login?error=${encodeURIComponent(message)}`);
    }
  }

  /** Test / CI helper — issues session JSON without browser redirect */
  async googleMock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await googleAuthService.handleMockSignIn(getAuthContext(req));
      res
        .cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, getRefreshCookieOptions())
        .status(200)
        .json({
          user: result.user,
          accessToken: result.accessToken,
        });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
