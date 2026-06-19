import { body, param } from 'express-validator';
import { workspaceIdParamValidation } from '../workspaces/workspace.validator';
import { meetingParamsValidation } from '../meetings/meeting.validator';

export const sendChatMessageValidation = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 4000 })
    .withMessage('message must be between 1 and 4000 characters'),
  body('sessionId').optional().isUUID().withMessage('Invalid session ID'),
  body('meetingId').optional().isUUID().withMessage('Invalid meeting ID'),
];

export const chatSessionParamsValidation = [
  ...workspaceIdParamValidation,
  param('sessionId').isUUID().withMessage('Invalid session ID'),
];

export const meetingChatParamsValidation = meetingParamsValidation;
