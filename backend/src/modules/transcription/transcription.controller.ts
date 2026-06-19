import { Request, Response, NextFunction } from 'express';
import { transcriptionOrchestratorService } from './services/transcription-orchestrator.service';
import { routeParam } from '../../utils/route-param';
import { AppError, ErrorCodes } from '../../utils/errors';

export class TranscriptionController {
  async uploadAudio(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const meetingId = routeParam(req.params.meetingId);

      if (!req.file) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Audio file is required');
      }

      const result = await transcriptionOrchestratorService.uploadAudio(
        workspaceId,
        meetingId,
        req.user!.id,
        req.file,
      );

      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const meetingId = routeParam(req.params.meetingId);
      const status = await transcriptionOrchestratorService.getTranscriptionStatus(
        workspaceId,
        meetingId,
      );
      res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  }
}

export const transcriptionController = new TranscriptionController();
