import { Router } from 'express';
import { validate } from '../../middlewares';
import { requireWorkspaceMember } from '../../middlewares/require-workspace';
import { aiProcessingRateLimiter } from '../../middlewares/rate-limit';
import { reportsController } from './reports.controller';
import {
  generateReportValidation,
  reportIdParamValidation,
} from './reports.validator';
import { workspaceIdParamValidation } from '../workspaces/workspace.validator';

const router = Router({ mergeParams: true });

router.use(requireWorkspaceMember);

router.get('/', validate(workspaceIdParamValidation), (req, res, next) =>
  reportsController.list(req, res, next),
);

router.post(
  '/generate',
  aiProcessingRateLimiter,
  validate([...workspaceIdParamValidation, ...generateReportValidation]),
  (req, res, next) => reportsController.generate(req, res, next),
);

router.get('/:reportId', validate(reportIdParamValidation), (req, res, next) =>
  reportsController.getById(req, res, next),
);

export { router as reportsRoutes };
