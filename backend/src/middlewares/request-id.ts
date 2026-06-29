import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { runWithObservabilityContext } from '../modules/observability/logging/log-context';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const userId = (req as Request & { user?: { id: string } }).user?.id;
  const workspaceId = req.headers['x-workspace-id'] as string | undefined;

  runWithObservabilityContext({ requestId, userId, workspaceId }, () => next());
}
