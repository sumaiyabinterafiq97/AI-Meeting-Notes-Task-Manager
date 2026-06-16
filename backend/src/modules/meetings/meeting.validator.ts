import { body, param, query } from 'express-validator';
import { MeetingStatus } from '@prisma/client';
import { MAX_TRANSCRIPT_BYTES, MIN_TRANSCRIPT_CHARS } from './meeting.dto';

export const workspaceIdParamValidation = [
  param('workspaceId').isUUID().withMessage('Invalid workspace ID'),
];

export const meetingParamsValidation = [
  param('workspaceId').isUUID().withMessage('Invalid workspace ID'),
  param('meetingId').isUUID().withMessage('Invalid meeting ID'),
];

export const createMeetingValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('meetingDate').isISO8601().withMessage('meetingDate must be a valid ISO 8601 date'),
  body('durationMinutes')
    .optional()
    .isInt({ min: 1 })
    .withMessage('durationMinutes must be a positive integer'),
  body('attendees').optional().isArray().withMessage('attendees must be an array'),
  body('attendees.*').optional().isString().withMessage('Each attendee must be a string'),
  body('tags').optional().isArray().withMessage('tags must be an array'),
  body('tags.*').optional().isString().withMessage('Each tag must be a string'),
  body('agenda').optional().isString().withMessage('agenda must be a string'),
];

export const updateMeetingValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('meetingDate').optional().isISO8601().withMessage('meetingDate must be a valid ISO 8601 date'),
  body('durationMinutes')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('durationMinutes must be a positive integer'),
  body('attendees').optional().isArray().withMessage('attendees must be an array'),
  body('attendees.*').optional().isString().withMessage('Each attendee must be a string'),
  body('tags').optional().isArray().withMessage('tags must be an array'),
  body('tags.*').optional().isString().withMessage('Each tag must be a string'),
  body('agenda').optional({ nullable: true }).isString().withMessage('agenda must be a string'),
];

export const listMeetingsQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(Object.values(MeetingStatus))
    .withMessage('Invalid status filter'),
  query('from').optional().isISO8601().withMessage('from must be a valid ISO 8601 date'),
  query('to').optional().isISO8601().withMessage('to must be a valid ISO 8601 date'),
  query('tag').optional().isString().withMessage('tag must be a string'),
  query('search').optional().isString().withMessage('search must be a string'),
];

export const uploadTranscriptValidation = [
  body('content')
    .isString()
    .withMessage('content is required')
    .isLength({ min: MIN_TRANSCRIPT_CHARS })
    .withMessage(`content must be at least ${MIN_TRANSCRIPT_CHARS} characters`)
    .custom((value: string) => {
      if (Buffer.byteLength(value, 'utf8') > MAX_TRANSCRIPT_BYTES) {
        throw new Error('content exceeds 5MB limit');
      }
      return true;
    }),
  body('sourceFormat')
    .isIn(['text', 'md', 'vtt', 'srt'])
    .withMessage('sourceFormat must be text, md, vtt, or srt'),
];
