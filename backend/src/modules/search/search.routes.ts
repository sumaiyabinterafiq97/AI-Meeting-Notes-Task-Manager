import { Router } from 'express';
import { searchController } from './search.controller';
import { searchQueryValidation } from './search.validator';
import { validate } from '../../middlewares';
import { requireWorkspaceMember } from '../../middlewares/require-workspace';

const router = Router({ mergeParams: true });

router.use(requireWorkspaceMember);

router.get('/', validate(searchQueryValidation), (req, res, next) =>
  searchController.search(req, res, next),
);

export { router as searchRoutes };
