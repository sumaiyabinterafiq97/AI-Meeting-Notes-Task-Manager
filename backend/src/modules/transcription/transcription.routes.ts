import { Router } from 'express';
import { param } from 'express-validator';
import { transcriptionController } from './transcription.controller';
import { audioUploadMiddleware } from './middleware/audio-upload.middleware';
import { validate } from '../../middlewares';
import { aiProcessingRateLimiter } from '../../middlewares/rate-limit';

const meetingParamsValidation = [
  param('workspaceId').isUUID().withMessage('Invalid workspace ID'),
  param('meetingId').isUUID().withMessage('Invalid meeting ID'),
];

export function createTranscriptionRoutes(): Router {
  const router = Router({ mergeParams: true });

  router.post(
    '/audio',
    aiProcessingRateLimiter,
    validate(meetingParamsValidation),
    audioUploadMiddleware,
    (req, res, next) => transcriptionController.uploadAudio(req, res, next),
  );

  router.get(
    '/transcription',
    validate(meetingParamsValidation),
    (req, res, next) => transcriptionController.getStatus(req, res, next),
  );

  return router;
}
