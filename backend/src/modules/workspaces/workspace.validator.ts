import { body, param } from 'express-validator';
import { WorkspaceRole } from '@prisma/client';

export const createWorkspaceValidation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be at most 2000 characters'),
];

export const updateWorkspaceValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be at most 2000 characters'),
];

export const createInvitationValidation = [
  body('email').isEmail().withMessage('Invalid email format').normalizeEmail(),
  body('role')
    .optional()
    .isIn([WorkspaceRole.MEMBER])
    .withMessage('Role must be MEMBER'),
];

export const updateMemberRoleValidation = [
  param('userId').isUUID().withMessage('Invalid user ID'),
  body('role')
    .isIn([WorkspaceRole.OWNER, WorkspaceRole.MEMBER])
    .withMessage('Role must be OWNER or MEMBER'),
];

export const workspaceIdParamValidation = [
  param('workspaceId').isUUID().withMessage('Invalid workspace ID'),
];

export const memberParamsValidation = [
  param('workspaceId').isUUID().withMessage('Invalid workspace ID'),
  param('userId').isUUID().withMessage('Invalid user ID'),
];

export const reindexWorkspaceValidation = [
  body('reason')
    .optional()
    .isIn(['model_upgrade', 'admin', 'corruption'])
    .withMessage('reason must be model_upgrade, admin, or corruption'),
];

export const invitationTokenParamValidation = [
  param('token').notEmpty().withMessage('Invitation token is required'),
];
