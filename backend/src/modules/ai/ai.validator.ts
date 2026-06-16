import { body, param } from 'express-validator';

export const aiMeetingParamsValidation = [
  param('meetingId').isUUID().withMessage('Invalid meetingId'),
];

export const updateAiOutputValidation = [
  body('summary').optional().isString().trim().isLength({ min: 1, max: 10000 }),
  body('topics').optional().isArray(),
  body('topics.*').optional().isString().trim().isLength({ min: 1, max: 200 }),
  body('decisions').optional().isArray(),
  body('risks').optional().isArray(),
];

export const acceptActionItemsValidation = [
  body('actionItemIds')
    .isArray({ min: 1 })
    .withMessage('actionItemIds must be a non-empty array'),
  body('actionItemIds.*').isUUID().withMessage('Invalid action item id'),
  body('overrides').optional().isArray(),
  body('overrides.*.id').optional().isUUID(),
  body('overrides.*.assigneeId').optional().isUUID(),
  body('overrides.*.dueDate').optional().isISO8601(),
  body('overrides.*.title').optional().isString().trim().isLength({ min: 1, max: 300 }),
];

export const rejectActionItemsValidation = [
  body('actionItemIds')
    .isArray({ min: 1 })
    .withMessage('actionItemIds must be a non-empty array'),
  body('actionItemIds.*').isUUID().withMessage('Invalid action item id'),
];
