import { Request, Response, NextFunction } from 'express';
import { searchService } from './search.service';
import { SearchQuery } from './search.dto';
import { routeParam } from '../../utils/route-param';

export class SearchController {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const result = await searchService.search(workspaceId, req.query as SearchQuery);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const searchController = new SearchController();
