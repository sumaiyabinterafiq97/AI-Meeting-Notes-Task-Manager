import { Router } from 'express';
import { validate } from '../../middlewares';
import { requireWorkspaceMember } from '../../middlewares/require-workspace';
import { knowledgeController } from './knowledge.controller';
import {
  knowledgeEntryParamsValidation,
  listKnowledgeQueryValidation,
} from './knowledge.validator';
import { workspaceIdParamValidation } from '../workspaces/workspace.validator';

const router = Router({ mergeParams: true });

router.use(requireWorkspaceMember);

router.get(
  '/',
  validate([...workspaceIdParamValidation, ...listKnowledgeQueryValidation]),
  (req, res, next) => knowledgeController.list(req, res, next),
);

router.get('/:entryId', validate(knowledgeEntryParamsValidation), (req, res, next) =>
  knowledgeController.getById(req, res, next),
);

export { router as knowledgeRoutes };
