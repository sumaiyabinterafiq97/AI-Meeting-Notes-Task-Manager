import { Request, Response, NextFunction } from 'express';
import { aiService } from './ai.service';
import {
  AcceptActionItemsDto,
  RejectActionItemsDto,
  UpdateAiOutputDto,
} from './ai.dto';
import { routeParam } from '../../utils/route-param';

export class AiController {
  async getAiOutput(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const meetingId = routeParam(req.params.meetingId);
      const output = await aiService.getAiOutput(workspaceId, meetingId);
      res.status(200).json(output);
    } catch (error) {
      next(error);
    }
  }

  async updateAiOutput(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const meetingId = routeParam(req.params.meetingId);
      const output = await aiService.updateAiOutput(
        workspaceId,
        meetingId,
        req.body as UpdateAiOutputDto,
      );
      res.status(200).json(output);
    } catch (error) {
      next(error);
    }
  }

  async listActionItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const meetingId = routeParam(req.params.meetingId);
      const result = await aiService.listActionItems(workspaceId, meetingId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async acceptActionItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const meetingId = routeParam(req.params.meetingId);
      const result = await aiService.acceptActionItems(
        workspaceId,
        meetingId,
        req.user!.id,
        req.body as AcceptActionItemsDto,
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async rejectActionItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const meetingId = routeParam(req.params.meetingId);
      const result = await aiService.rejectActionItems(
        workspaceId,
        meetingId,
        req.body as RejectActionItemsDto,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const aiController = new AiController();
