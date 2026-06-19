import { Router } from 'express';
import { chatController } from './controllers/chat.controller';
import { validate } from '../../middlewares';
import {
  meetingChatParamsValidation,
  sendChatMessageValidation,
} from './chat.validator';
import { chatRateLimiter } from '../../middlewares/rate-limit';

const router = Router({ mergeParams: true });

router.get('/', validate(meetingChatParamsValidation), (req, res, next) =>
  chatController.getMeetingMessages(req, res, next),
);

router.post(
  '/',
  chatRateLimiter,
  validate([...meetingChatParamsValidation, ...sendChatMessageValidation]),
  (req, res, next) => chatController.sendMeetingMessage(req, res, next),
);

export { router as meetingChatRoutes };
