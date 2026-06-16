import { body, param, query } from 'express-validator';
import { TaskPriority, TaskStatus } from '@prisma/client';

export const workspaceIdParamValidation = [
  param('workspaceId').isUUID().withMessage('Invalid workspace ID'),
];

export const taskParamsValidation = [
  param('workspaceId').isUUID().withMessage('Invalid workspace ID'),
  param('taskId').isUUID().withMessage('Invalid task ID'),
];

export const createTaskValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 300 })
    .withMessage('Title must be between 1 and 300 characters'),
  body('description').optional().isString().withMessage('description must be a string'),
  body('assigneeId').optional().isUUID().withMessage('assigneeId must be a valid UUID'),
  body('dueDate').optional().isISO8601().withMessage('dueDate must be a valid ISO 8601 date'),
  body('priority')
    .optional()
    .isIn(Object.values(TaskPriority))
    .withMessage('priority must be LOW, MEDIUM, or HIGH'),
  body('meetingId').optional().isUUID().withMessage('meetingId must be a valid UUID'),
];

export const updateTaskValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 300 })
    .withMessage('Title must be between 1 and 300 characters'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('description must be a string'),
  body('status')
    .optional()
    .isIn(Object.values(TaskStatus))
    .withMessage('status must be TODO, IN_PROGRESS, or DONE'),
  body('assigneeId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('assigneeId must be a valid UUID'),
  body('dueDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('dueDate must be a valid ISO 8601 date'),
  body('priority')
    .optional()
    .isIn(Object.values(TaskPriority))
    .withMessage('priority must be LOW, MEDIUM, or HIGH'),
  body('position')
    .optional()
    .isInt({ min: 0 })
    .withMessage('position must be a non-negative integer'),
];

export const listTasksQueryValidation = [
  query('status')
    .optional()
    .isIn(Object.values(TaskStatus))
    .withMessage('status must be TODO, IN_PROGRESS, or DONE'),
  query('assigneeId').optional().isUUID().withMessage('assigneeId must be a valid UUID'),
  query('priority')
    .optional()
    .isIn(Object.values(TaskPriority))
    .withMessage('priority must be LOW, MEDIUM, or HIGH'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('search must be a string'),
];

export const boardQueryValidation = [
  query('assigneeId').optional().isUUID().withMessage('assigneeId must be a valid UUID'),
  query('doneLimit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('doneLimit must be between 1 and 100'),
];

export const createCommentValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('content must be between 1 and 5000 characters'),
];
