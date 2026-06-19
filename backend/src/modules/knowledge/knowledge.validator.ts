import { param, query } from 'express-validator';
import { workspaceIdParamValidation } from '../workspaces/workspace.validator';

export const knowledgeEntryParamsValidation = [
  ...workspaceIdParamValidation,
  param('entryId').isUUID().withMessage('Invalid knowledge entry ID'),
];

export const listKnowledgeQueryValidation = [
  query('entityType')
    .optional()
    .isIn(['PERSON', 'PROJECT', 'DECISION', 'CONCEPT', 'PROCESS', 'OTHER'])
    .withMessage('entityType must be a valid knowledge entity type'),
];
