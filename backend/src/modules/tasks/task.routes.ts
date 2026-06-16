import { Router } from 'express';
import { taskController } from './task.controller';
import {
  createTaskValidation,
  updateTaskValidation,
  listTasksQueryValidation,
  boardQueryValidation,
  taskParamsValidation,
  createCommentValidation,
} from './task.validator';
import { validate } from '../../middlewares';
import { requireWorkspaceMember } from '../../middlewares/require-workspace';

const router = Router({ mergeParams: true });

router.use(requireWorkspaceMember);

router.post('/', validate(createTaskValidation), (req, res, next) =>
  taskController.create(req, res, next),
);

router.get('/board', validate(boardQueryValidation), (req, res, next) =>
  taskController.board(req, res, next),
);

router.get('/', validate(listTasksQueryValidation), (req, res, next) =>
  taskController.list(req, res, next),
);

router.get('/:taskId', validate(taskParamsValidation), (req, res, next) =>
  taskController.getById(req, res, next),
);

router.patch(
  '/:taskId',
  validate([...taskParamsValidation, ...updateTaskValidation]),
  (req, res, next) => taskController.update(req, res, next),
);

router.delete('/:taskId', validate(taskParamsValidation), (req, res, next) =>
  taskController.remove(req, res, next),
);

router.post(
  '/:taskId/comments',
  validate([...taskParamsValidation, ...createCommentValidation]),
  (req, res, next) => taskController.createComment(req, res, next),
);

router.get('/:taskId/comments', validate(taskParamsValidation), (req, res, next) =>
  taskController.listComments(req, res, next),
);

export { router as taskRoutes };
