import { Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../config/env';
import { AppError, ErrorCodes } from '../utils/errors';
import { verifyAccessToken } from '../lib/jwt';

function rateLimitHandler(_req: Request, res: Response): void {
  res.status(429).json({
    error: {
      code: ErrorCodes.RATE_LIMITED,
      message: 'Too many requests',
    },
  });
}

function passthrough(_req: Request, _res: Response, next: NextFunction): void {
  next();
}

function userOrIpKey(req: Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = verifyAccessToken(authHeader.slice(7));
      return payload.sub;
    } catch {
      // fall through to IP
    }
  }
  return ipKeyGenerator(req.ip ?? '127.0.0.1');
}

export const authRateLimiter =
  env.NODE_ENV === 'test'
    ? passthrough
    : rateLimit({
        windowMs: 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        handler: rateLimitHandler,
      });

export const forgotPasswordRateLimiter =
  env.NODE_ENV === 'test'
    ? passthrough
    : rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 5,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => {
          const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : '';
          if (email) {
            return email;
          }
          return ipKeyGenerator(req.ip ?? '127.0.0.1');
        },
        handler: rateLimitHandler,
      });

export const generalApiRateLimiter =
  env.NODE_ENV === 'test'
    ? passthrough
    : rateLimit({
        windowMs: 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: userOrIpKey,
        handler: rateLimitHandler,
      });

export const aiProcessingRateLimiter =
  env.NODE_ENV === 'test'
    ? passthrough
    : rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 20,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => {
          const workspaceId = req.params.workspaceId;
          if (typeof workspaceId === 'string' && workspaceId.length > 0) {
            return workspaceId;
          }
          return userOrIpKey(req);
        },
        handler: rateLimitHandler,
      });

export const chatRateLimiter =
  env.NODE_ENV === 'test'
    ? passthrough
    : rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 60,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: userOrIpKey,
        handler: rateLimitHandler,
      });

export function validateRefreshOrigin(req: Request, _res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  if (origin && origin !== env.CORS_ORIGIN) {
    next(new AppError(403, ErrorCodes.FORBIDDEN, 'Invalid origin'));
    return;
  }

  next();
}
