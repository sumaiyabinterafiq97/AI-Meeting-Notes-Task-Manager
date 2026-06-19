import { Request, Response, NextFunction } from 'express';
import { reportsService } from './reports.service';
import { routeParam } from '../../utils/route-param';

export class ReportsController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const reports = await reportsService.listReports(workspaceId);
      res.status(200).json({ data: reports });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const reportId = routeParam(req.params.reportId);
      const report = await reportsService.getReport(workspaceId, reportId);
      res.status(200).json(report);
    } catch (error) {
      next(error);
    }
  }

  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const report = await reportsService.generateReport(workspaceId, req.body);
      res.status(201).json(report);
    } catch (error) {
      next(error);
    }
  }
}

export const reportsController = new ReportsController();
