import { query } from 'express-validator';

export const searchQueryValidation = [
  query('q')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  query('type')
    .optional()
    .isIn(['meetings', 'tasks', 'all'])
    .withMessage('type must be meetings, tasks, or all'),
  query('mode')
    .optional()
    .isIn(['keyword', 'semantic', 'hybrid'])
    .withMessage('mode must be keyword, semantic, or hybrid'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
  query('similarityMin')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('similarityMin must be between 0 and 1'),
  query('dateFrom').optional().isISO8601().withMessage('dateFrom must be a valid ISO date'),
  query('dateTo').optional().isISO8601().withMessage('dateTo must be a valid ISO date'),
  query('sourceTypes').optional().isString().withMessage('sourceTypes must be a comma-separated string'),
  query('meetingId').optional().isUUID().withMessage('meetingId must be a valid UUID'),
];
