import { Router } from 'express';
import { userController } from './user.controller';
import {
  updateProfileValidation,
  updateNotificationPreferencesValidation,
} from './user.validator';
import { authenticate, validate } from '../../middlewares';

const router = Router();

router.use(authenticate);

router.patch('/me', validate(updateProfileValidation), (req, res, next) =>
  userController.updateMe(req, res, next),
);

router.get('/me/notification-preferences', (req, res, next) =>
  userController.getNotificationPreferences(req, res, next),
);

router.patch(
  '/me/notification-preferences',
  validate(updateNotificationPreferencesValidation),
  (req, res, next) => userController.updateNotificationPreferences(req, res, next),
);

export { router as userRoutes };
