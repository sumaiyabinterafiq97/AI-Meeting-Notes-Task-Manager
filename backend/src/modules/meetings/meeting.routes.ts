import { Router } from 'express';
import { meetingController } from './meeting.controller';
import {
  meetingParamsValidation,
  createMeetingValidation,
  updateMeetingValidation,
  listMeetingsQueryValidation,
  uploadTranscriptValidation,
} from './meeting.validator';
import { validate } from '../../middlewares';
import { requireWorkspaceMember } from '../../middlewares/require-workspace';
import { aiProcessingRateLimiter } from '../../middlewares/rate-limit';
import { aiRoutes } from '../ai/ai.routes';

const router = Router({ mergeParams: true });

router.use(requireWorkspaceMember);

router.post('/', validate(createMeetingValidation), (req, res, next) =>
  meetingController.create(req, res, next),
);

router.get('/', validate(listMeetingsQueryValidation), (req, res, next) =>
  meetingController.list(req, res, next),
);

router.get('/:meetingId', validate(meetingParamsValidation), (req, res, next) =>
  meetingController.getById(req, res, next),
);

router.patch(
  '/:meetingId',
  validate([...meetingParamsValidation, ...updateMeetingValidation]),
  (req, res, next) => meetingController.update(req, res, next),
);

router.delete('/:meetingId', validate(meetingParamsValidation), (req, res, next) =>
  meetingController.remove(req, res, next),
);

router.put(
  '/:meetingId/transcript',
  aiProcessingRateLimiter,
  validate([...meetingParamsValidation, ...uploadTranscriptValidation]),
  (req, res, next) => meetingController.uploadTranscript(req, res, next),
);

router.post(
  '/:meetingId/reprocess',
  aiProcessingRateLimiter,
  validate(meetingParamsValidation),
  (req, res, next) => meetingController.reprocess(req, res, next),
);

router.use('/:meetingId', aiRoutes);

export { router as meetingRoutes };
