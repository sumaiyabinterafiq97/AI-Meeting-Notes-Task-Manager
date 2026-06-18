import { z } from 'zod';
import { MIN_TRANSCRIPT_CHARS, MAX_TRANSCRIPT_BYTES } from '../types/meeting.types';

export const createMeetingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  meetingDate: z.string().min(1, 'Meeting date is required'),
  durationMinutes: z
    .string()
    .optional()
    .refine((value) => !value || (Number.isInteger(Number(value)) && Number(value) > 0), {
      message: 'Duration must be a positive number',
    }),
  attendeesInput: z.string().optional(),
  tagsInput: z.string().optional(),
  agenda: z.string().trim().optional(),
});

export const updateMeetingSchema = createMeetingSchema;

export const uploadTranscriptSchema = z.object({
  content: z
    .string()
    .min(MIN_TRANSCRIPT_CHARS, `Transcript must be at least ${MIN_TRANSCRIPT_CHARS} characters`)
    .refine((value) => new TextEncoder().encode(value).length <= MAX_TRANSCRIPT_BYTES, {
      message: 'Transcript exceeds 5MB limit',
    }),
  sourceFormat: z.enum(['text', 'md', 'vtt', 'srt']),
});

export type CreateMeetingFormData = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingFormData = z.infer<typeof updateMeetingSchema>;
export type UploadTranscriptFormData = z.infer<typeof uploadTranscriptSchema>;

function parseCommaSeparated(value?: string): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toMeetingPayload(data: CreateMeetingFormData | UpdateMeetingFormData) {
  return {
    title: data.title,
    meetingDate: data.meetingDate,
    ...(data.durationMinutes && { durationMinutes: Number(data.durationMinutes) }),
    attendees: parseCommaSeparated(data.attendeesInput),
    tags: parseCommaSeparated(data.tagsInput),
    ...(data.agenda && { agenda: data.agenda }),
  };
}
