import { Router } from 'express';
import { param } from 'express-validator';
import { WorkspaceRole } from '@prisma/client';
import { calendarController } from './calendar.controller';
import { validate } from '../../middlewares';
import { requireWorkspaceMember, requireRole } from '../../middlewares/require-workspace';

const workspaceParams = [
  param('workspaceId').isUUID().withMessage('Invalid workspace ID'),
];

const connectionParams = [
  ...workspaceParams,
  param('connectionId').isUUID().withMessage('Invalid connection ID'),
];

const providerParams = [
  ...workspaceParams,
  param('provider')
    .isIn(['google', 'microsoft', 'outlook'])
    .withMessage('provider must be google, microsoft, or outlook'),
];

export function createWorkspaceCalendarRoutes(): Router {
  const router = Router({ mergeParams: true });

  router.use(requireWorkspaceMember);

  router.get('/connections', validate(workspaceParams), (req, res, next) =>
    calendarController.listConnections(req, res, next),
  );

  router.get('/sync-status', validate(workspaceParams), (req, res, next) =>
    calendarController.getSyncStatus(req, res, next),
  );

  router.post(
    '/connect/:provider',
    validate(providerParams),
    requireRole([WorkspaceRole.OWNER]),
    (req, res, next) => calendarController.connect(req, res, next),
  );

  router.delete(
    '/connections/:connectionId',
    validate(connectionParams),
    requireRole([WorkspaceRole.OWNER]),
    (req, res, next) => calendarController.disconnect(req, res, next),
  );

  router.post('/sync', validate(workspaceParams), (req, res, next) =>
    calendarController.triggerSync(req, res, next),
  );

  return router;
}

export function createCalendarOAuthRoutes(): Router {
  const router = Router();

  router.get(
    '/:provider/callback',
    validate([param('provider').isIn(['google', 'microsoft', 'outlook'])]),
    (req, res, next) => calendarController.oauthCallback(req, res, next),
  );

  return router;
}
