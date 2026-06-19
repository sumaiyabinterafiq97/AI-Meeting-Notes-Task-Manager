import { body, param } from 'express-validator';
import { workspaceIdParamValidation } from '../workspaces/workspace.validator';

export const reportIdParamValidation = [
  ...workspaceIdParamValidation,
  param('reportId').isUUID().withMessage('Invalid report ID'),
];

export const generateReportValidation = [
  body('dateFrom').optional().isISO8601().withMessage('dateFrom must be ISO 8601'),
  body('dateTo').optional().isISO8601().withMessage('dateTo must be ISO 8601'),
];
