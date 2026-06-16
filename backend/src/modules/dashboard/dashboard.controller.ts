import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';
import { routeParam } from '../../utils/route-param';

export class DashboardController {
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const dashboard = await dashboardService.getDashboard(workspaceId);
      res.status(200).json(dashboard);
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
