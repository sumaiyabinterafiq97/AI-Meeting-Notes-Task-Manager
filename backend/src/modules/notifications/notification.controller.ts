import { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service';
import { routeParam } from '../../utils/route-param';

export class NotificationController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.listNotifications(req.user!.id, req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notificationId = routeParam(req.params.id);
      const result = await notificationService.markNotificationRead(
        notificationId,
        req.user!.id,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.markAllNotificationsRead(req.user!.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
