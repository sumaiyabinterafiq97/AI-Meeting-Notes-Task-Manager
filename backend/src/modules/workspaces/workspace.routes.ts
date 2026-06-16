import { Router } from 'express';
import { WorkspaceRole } from '@prisma/client';
import { workspaceController } from './workspace.controller';
import {
  createWorkspaceValidation,
  updateWorkspaceValidation,
  createInvitationValidation,
  updateMemberRoleValidation,
  workspaceIdParamValidation,
  memberParamsValidation,
  invitationTokenParamValidation,
} from './workspace.validator';
import { authenticate, validate } from '../../middlewares';
import { requireWorkspaceMember, requireRole } from '../../middlewares/require-workspace';
import { meetingRoutes } from '../meetings/meeting.routes';
import { taskRoutes } from '../tasks/task.routes';
import { dashboardRoutes } from '../dashboard/dashboard.routes';
import { searchRoutes } from '../search/search.routes';

const router = Router();

router.use(authenticate);

router.post('/', validate(createWorkspaceValidation), (req, res, next) =>
  workspaceController.create(req, res, next),
);

router.get('/', (req, res, next) => workspaceController.list(req, res, next));

router.use(
  '/:workspaceId/meetings',
  validate(workspaceIdParamValidation),
  meetingRoutes,
);

router.use(
  '/:workspaceId/tasks',
  validate(workspaceIdParamValidation),
  taskRoutes,
);

router.use(
  '/:workspaceId/dashboard',
  validate(workspaceIdParamValidation),
  dashboardRoutes,
);

router.use(
  '/:workspaceId/search',
  validate(workspaceIdParamValidation),
  searchRoutes,
);

router.get(
  '/:workspaceId',
  validate(workspaceIdParamValidation),
  requireWorkspaceMember,
  (req, res, next) => workspaceController.getById(req, res, next),
);

router.patch(
  '/:workspaceId',
  validate([...workspaceIdParamValidation, ...updateWorkspaceValidation]),
  requireWorkspaceMember,
  requireRole([WorkspaceRole.OWNER]),
  (req, res, next) => workspaceController.update(req, res, next),
);

router.delete(
  '/:workspaceId',
  validate(workspaceIdParamValidation),
  requireWorkspaceMember,
  requireRole([WorkspaceRole.OWNER]),
  (req, res, next) => workspaceController.remove(req, res, next),
);

router.post(
  '/:workspaceId/invitations',
  validate([...workspaceIdParamValidation, ...createInvitationValidation]),
  requireWorkspaceMember,
  requireRole([WorkspaceRole.OWNER]),
  (req, res, next) => workspaceController.createInvitation(req, res, next),
);

router.get(
  '/:workspaceId/invitations',
  validate(workspaceIdParamValidation),
  requireWorkspaceMember,
  requireRole([WorkspaceRole.OWNER]),
  (req, res, next) => workspaceController.listInvitations(req, res, next),
);

router.get(
  '/:workspaceId/members',
  validate(workspaceIdParamValidation),
  requireWorkspaceMember,
  (req, res, next) => workspaceController.listMembers(req, res, next),
);

router.patch(
  '/:workspaceId/members/:userId',
  validate([...memberParamsValidation, ...updateMemberRoleValidation]),
  requireWorkspaceMember,
  requireRole([WorkspaceRole.OWNER]),
  (req, res, next) => workspaceController.updateMember(req, res, next),
);

router.delete(
  '/:workspaceId/members/:userId',
  validate(memberParamsValidation),
  requireWorkspaceMember,
  requireRole([WorkspaceRole.OWNER]),
  (req, res, next) => workspaceController.removeMember(req, res, next),
);

export { router as workspaceRoutes };
