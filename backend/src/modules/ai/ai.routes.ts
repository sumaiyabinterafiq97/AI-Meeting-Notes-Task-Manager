import { Router } from 'express';
import { aiController } from './ai.controller';
import {
  aiMeetingParamsValidation,
  updateAiOutputValidation,
  acceptActionItemsValidation,
  rejectActionItemsValidation,
} from './ai.validator';
import { validate } from '../../middlewares';

const router = Router({ mergeParams: true });

router.get(
  '/ai-output',
  validate(aiMeetingParamsValidation),
  (req, res, next) => aiController.getAiOutput(req, res, next),
);

router.patch(
  '/ai-output',
  validate([...aiMeetingParamsValidation, ...updateAiOutputValidation]),
  (req, res, next) => aiController.updateAiOutput(req, res, next),
);

router.get(
  '/action-items',
  validate(aiMeetingParamsValidation),
  (req, res, next) => aiController.listActionItems(req, res, next),
);

router.post(
  '/action-items/accept',
  validate([...aiMeetingParamsValidation, ...acceptActionItemsValidation]),
  (req, res, next) => aiController.acceptActionItems(req, res, next),
);

router.post(
  '/action-items/reject',
  validate([...aiMeetingParamsValidation, ...rejectActionItemsValidation]),
  (req, res, next) => aiController.rejectActionItems(req, res, next),
);

export { router as aiRoutes };
