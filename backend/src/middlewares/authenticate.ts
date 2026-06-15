import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../utils/errors';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError(401, ErrorCodes.UNAUTHORIZED, 'Authentication required'));
    return;
  }

  // Token validation will be implemented in auth feature
  const token = authHeader.slice(7);
  req.user = {
    id: 'placeholder',
    email: 'placeholder@example.com',
    token,
  };

  next();
}
