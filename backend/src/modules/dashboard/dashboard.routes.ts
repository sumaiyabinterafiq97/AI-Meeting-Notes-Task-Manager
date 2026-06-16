import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { requireWorkspaceMember } from '../../middlewares/require-workspace';

const router = Router({ mergeParams: true });

router.use(requireWorkspaceMember);

router.get('/', (req, res, next) => dashboardController.get(req, res, next));

export { router as dashboardRoutes };
