import { Router } from 'express';
import { chatController } from './controllers/chat.controller';
import { validate } from '../../middlewares';
import { requireWorkspaceMember } from '../../middlewares/require-workspace';
import { workspaceIdParamValidation } from '../workspaces/workspace.validator';
import {
  sendChatMessageValidation,
  chatSessionParamsValidation,
} from './chat.validator';
import { chatRateLimiter } from '../../middlewares/rate-limit';

const router = Router({ mergeParams: true });

router.use(requireWorkspaceMember);

router.get('/sessions', validate(workspaceIdParamValidation), (req, res, next) =>
  chatController.listWorkspaceSessions(req, res, next),
);

router.get('/sessions/:sessionId', validate(chatSessionParamsValidation), (req, res, next) =>
  chatController.getSessionMessages(req, res, next),
);

router.delete('/sessions/:sessionId', validate(chatSessionParamsValidation), (req, res, next) =>
  chatController.clearSession(req, res, next),
);

router.post(
  '/',
  chatRateLimiter,
  validate([...workspaceIdParamValidation, ...sendChatMessageValidation]),
  (req, res, next) => chatController.sendWorkspaceMessage(req, res, next),
);

export { router as workspaceChatRoutes };
