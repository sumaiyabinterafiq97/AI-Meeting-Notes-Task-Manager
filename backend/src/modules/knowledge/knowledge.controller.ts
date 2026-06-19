import { Request, Response, NextFunction } from 'express';
import { knowledgeExtractionService } from './knowledge.service';
import { routeParam } from '../../utils/route-param';

export class KnowledgeController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const entityType = typeof req.query.entityType === 'string' ? req.query.entityType : undefined;
      const entries = await knowledgeExtractionService.listEntries(workspaceId, entityType);
      res.status(200).json({ data: entries });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const entryId = routeParam(req.params.entryId);
      const entry = await knowledgeExtractionService.getEntry(workspaceId, entryId);
      res.status(200).json(entry);
    } catch (error) {
      next(error);
    }
  }
}

export const knowledgeController = new KnowledgeController();
