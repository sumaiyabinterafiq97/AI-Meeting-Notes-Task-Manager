import { Request, Response, NextFunction } from 'express';
import { insightsService } from './insights.service';
import { routeParam } from '../../utils/route-param';

export class InsightsController {
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const insights = await insightsService.getInsights(workspaceId);
      res.status(200).json(insights);
    } catch (error) {
      next(error);
    }
  }
}

export const insightsController = new InsightsController();
