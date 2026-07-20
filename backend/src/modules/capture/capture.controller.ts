import { Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { captureHandoffService } from './services/capture-handoff.service';
import { routeParam } from '../../utils/route-param';

export const importMeetingValidation = [
  body('title').optional().isString().isLength({ max: 200 }),
  body('meetingDate').optional().isISO8601(),
  body('durationMinutes')
    .optional()
    .isInt({ min: 1, max: 24 * 60 }),
  body('attendees').optional().isArray({ max: 50 }),
  body('agenda').optional().isString().isLength({ max: 10_000 }),
  body('transcriptText').optional().isString(),
  body('vttContent').optional().isString(),
  body('externalMeetingId').optional().isString().isLength({ max: 255 }),
  body('externalRecordingId').optional().isString().isLength({ max: 255 }),
];

export class CaptureController {
  async importZoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const result = await captureHandoffService.importFromProvider(
        workspaceId,
        req.user!.id,
        'zoom',
        req.body,
      );
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  }

  async importGoogleMeet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const result = await captureHandoffService.importFromProvider(
        workspaceId,
        req.user!.id,
        'google-meet',
        req.body,
      );
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  }

  async importTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const result = await captureHandoffService.importFromProvider(
        workspaceId,
        req.user!.id,
        'teams',
        req.body,
      );
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  }

  async listNeedingTranscript(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const data = await captureHandoffService.listNeedingTranscript(workspaceId);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  }
}

export const captureController = new CaptureController();
