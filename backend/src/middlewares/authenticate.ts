import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError, ErrorCodes } from '../utils/errors';
import { verifyAccessToken } from '../lib/jwt';
import { authRepository } from '../modules/auth/auth.repository';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError(401, ErrorCodes.UNAUTHORIZED, 'Authentication required'));
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);

    authRepository
      .findUserById(payload.sub)
      .then((user) => {
        if (!user) {
          next(new AppError(401, ErrorCodes.UNAUTHORIZED, 'Authentication required'));
          return;
        }

        req.user = {
          id: user.id,
          email: user.email,
        };
        next();
      })
      .catch(() => {
        next(new AppError(401, ErrorCodes.UNAUTHORIZED, 'Authentication required'));
      });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError(401, ErrorCodes.UNAUTHORIZED, 'Token expired'));
      return;
    }

    next(new AppError(401, ErrorCodes.UNAUTHORIZED, 'Authentication required'));
  }
}
