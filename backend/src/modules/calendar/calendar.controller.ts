import { Request, Response, NextFunction } from 'express';
import { CalendarProvider } from '@prisma/client';
import { calendarService } from './services/calendar.service';
import { routeParam } from '../../utils/route-param';
import { AppError, ErrorCodes } from '../../utils/errors';
import { env } from '../../config/env';

function parseProvider(value: string): CalendarProvider {
  const normalized = value.toLowerCase();
  if (normalized === 'google') {
    return CalendarProvider.GOOGLE;
  }
  if (normalized === 'microsoft' || normalized === 'outlook') {
    return CalendarProvider.MICROSOFT;
  }
  throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid calendar provider');
}

export class CalendarController {
  async listConnections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const connections = await calendarService.listConnections(workspaceId);
      res.status(200).json({ data: connections });
    } catch (error) {
      next(error);
    }
  }

  async getSyncStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const status = await calendarService.getSyncStatus(workspaceId);
      res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  }

  async connect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const provider = parseProvider(routeParam(req.params.provider));
      const result = await calendarService.startOAuth(workspaceId, req.user!.id, provider);

      if (result.mock) {
        res.status(201).json({
          provider,
          connected: true,
          mock: true,
        });
        return;
      }

      res.status(200).json({
        provider,
        authorizationUrl: result.authorizationUrl,
      });
    } catch (error) {
      next(error);
    }
  }

  async disconnect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const connectionId = routeParam(req.params.connectionId);
      await calendarService.disconnect(workspaceId, connectionId, req.user!.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async triggerSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const result = await calendarService.triggerSync(workspaceId);

      if (result.queued) {
        res.status(202).json({ queued: true });
        return;
      }

      res.status(200).json({ results: result.results });
    } catch (error) {
      next(error);
    }
  }

  async oauthCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const provider = parseProvider(routeParam(req.params.provider));
      const code = typeof req.query.code === 'string' ? req.query.code : '';
      const state = typeof req.query.state === 'string' ? req.query.state : '';

      if (!code || !state) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Missing OAuth code or state');
      }

      const { workspaceId } = await calendarService.handleOAuthCallback(provider, code, state);
      res.redirect(`${env.FRONTEND_URL}/workspaces/${workspaceId}/settings?calendar=connected`);
    } catch (error) {
      next(error);
    }
  }
}

export const calendarController = new CalendarController();
