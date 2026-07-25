import { Request, Response, NextFunction } from 'express';
import { transcriptionOrchestratorService } from './services/transcription-orchestrator.service';
import { routeParam } from '../../utils/route-param';
import { AppError, ErrorCodes } from '../../utils/errors';
import type { StartTranscriptionDto, TranscriptionMode } from './types/transcription.types';

function parseMode(raw: unknown): TranscriptionMode | undefined {
  if (raw === 'transcribe_original' || raw === 'translate_to_english') {
    return raw;
  }
  return undefined;
}

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

      // 201: stored only — pipeline not started
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async startTranscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const meetingId = routeParam(req.params.meetingId);
      const body = (req.body ?? {}) as StartTranscriptionDto;
      const mode = parseMode(body.mode);

      if (body.mode !== undefined && mode === undefined) {
        throw new AppError(
          400,
          ErrorCodes.VALIDATION_ERROR,
          'mode must be translate_to_english or transcribe_original',
        );
      }

      const result = await transcriptionOrchestratorService.startTranscription(
        workspaceId,
        meetingId,
        req.user!.id,
        { mode },
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

  async retry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = routeParam(req.params.workspaceId);
      const meetingId = routeParam(req.params.meetingId);
      const result = await transcriptionOrchestratorService.retryTranscription(
        workspaceId,
        meetingId,
        req.user!.id,
      );
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const transcriptionController = new TranscriptionController();
