import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
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

function getAuthContext(req: Request): AuthContext {
  return {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  };
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
}

export const authController = new AuthController();
