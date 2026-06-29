import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError, ErrorCodes } from '../utils/errors';

/**
 * Protects observability admin endpoints when OBSERVABILITY_API_KEY is set.
 * Prometheus scrape (`GET /observability/metrics`) remains open for standard collectors.
 */
export function requireObservabilityAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const apiKey = process.env.OBSERVABILITY_API_KEY;
  if (!apiKey || env.NODE_ENV === 'test') {
    next();
    return;
  }

  const provided = req.headers['x-observability-key'];
  if (provided !== apiKey) {
    next(new AppError(401, ErrorCodes.UNAUTHORIZED, 'Observability admin access denied'));
    return;
  }

  next();
}
