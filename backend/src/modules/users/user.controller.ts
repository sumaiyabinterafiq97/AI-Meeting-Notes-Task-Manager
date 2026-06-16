import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { UpdateProfileDto, UpdateNotificationPreferencesDto } from './user.dto';

export class UserController {
  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.updateProfile(req.user!.id, req.body as UpdateProfileDto);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  async getNotificationPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const prefs = await userService.getNotificationPreferences(req.user!.id);
      res.status(200).json(prefs);
    } catch (error) {
      next(error);
    }
  }

  async updateNotificationPreferences(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const prefs = await userService.updateNotificationPreferences(
        req.user!.id,
        req.body as UpdateNotificationPreferencesDto,
      );
      res.status(200).json(prefs);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
