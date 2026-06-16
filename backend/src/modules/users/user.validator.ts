import { body } from 'express-validator';

export const updateProfileValidation = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Display name must be between 2 and 100 characters'),
  body('avatarUrl')
    .optional({ nullable: true })
    .isURL()
    .withMessage('avatarUrl must be a valid URL'),
];

export const updateNotificationPreferencesValidation = [
  body('emailTaskAssigned').optional().isBoolean().withMessage('emailTaskAssigned must be a boolean'),
  body('emailDueSoon').optional().isBoolean().withMessage('emailDueSoon must be a boolean'),
  body('inAppMentions').optional().isBoolean().withMessage('inAppMentions must be a boolean'),
];
