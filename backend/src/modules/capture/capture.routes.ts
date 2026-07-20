import { Router } from 'express';
import { param } from 'express-validator';
import { captureController, importMeetingValidation } from './capture.controller';
import { validate } from '../../middlewares';
import { aiProcessingRateLimiter } from '../../middlewares/rate-limit';

const workspaceParams = [
  param('workspaceId').isUUID().withMessage('Invalid workspace ID'),
];

/**
 * Capture routes mounted under /workspaces/:workspaceId/meetings
 * - GET  /needing-transcript
 * - POST /imports/zoom|google-meet|teams
 */
export function createCaptureRoutes(): Router {
  const router = Router({ mergeParams: true });

  router.get(
    '/needing-transcript',
    validate(workspaceParams),
    (req, res, next) => captureController.listNeedingTranscript(req, res, next),
  );

  router.post(
    '/imports/zoom',
    aiProcessingRateLimiter,
    validate([...workspaceParams, ...importMeetingValidation]),
    (req, res, next) => captureController.importZoom(req, res, next),
  );

  router.post(
    '/imports/google-meet',
    aiProcessingRateLimiter,
    validate([...workspaceParams, ...importMeetingValidation]),
    (req, res, next) => captureController.importGoogleMeet(req, res, next),
  );

  router.post(
    '/imports/teams',
    aiProcessingRateLimiter,
    validate([...workspaceParams, ...importMeetingValidation]),
    (req, res, next) => captureController.importTeams(req, res, next),
  );

  return router;
}
