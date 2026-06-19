import { Router } from 'express';
import { validate } from '../../middlewares';
import { requireWorkspaceMember } from '../../middlewares/require-workspace';
import { insightsController } from './insights.controller';
import { workspaceIdParamValidation } from '../workspaces/workspace.validator';

const router = Router({ mergeParams: true });

router.use(requireWorkspaceMember);

router.get('/', validate(workspaceIdParamValidation), (req, res, next) =>
  insightsController.get(req, res, next),
);

export { router as insightsRoutes };
