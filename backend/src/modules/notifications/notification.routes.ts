import { Router } from 'express';
import { param, query } from 'express-validator';
import { notificationController } from './notification.controller';
import { authenticate, validate } from '../../middlewares';

const router = Router();

router.use(authenticate);

const notificationIdValidation = [param('id').isUUID().withMessage('Invalid notification ID')];

const listQueryValidation = [
  query('unreadOnly').optional().isIn(['true', 'false']).withMessage('unreadOnly must be true or false'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

router.get('/', validate(listQueryValidation), (req, res, next) =>
  notificationController.list(req, res, next),
);

router.patch('/:id/read', validate(notificationIdValidation), (req, res, next) =>
  notificationController.markRead(req, res, next),
);

router.post('/read-all', (req, res, next) =>
  notificationController.markAllRead(req, res, next),
);

export { router as notificationRoutes };
