import { Router } from 'express';
import { workspaceController } from './workspace.controller';
import { invitationTokenParamValidation } from './workspace.validator';
import { authenticate, validate } from '../../middlewares';

const router = Router();

router.post(
  '/:token/accept',
  authenticate,
  validate(invitationTokenParamValidation),
  (req, res, next) => workspaceController.acceptInvitation(req, res, next),
);

export { router as invitationRoutes };
