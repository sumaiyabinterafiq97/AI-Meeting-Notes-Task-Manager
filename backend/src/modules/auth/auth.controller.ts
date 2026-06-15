import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { RegisterDto, LoginDto } from './auth.dto';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body as RegisterDto;
      const result = await authService.register(data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body as LoginDto;
      const result = await authService.login(data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (userId) {
        await authService.logout(userId);
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
