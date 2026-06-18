import { describe, it, expect } from 'vitest';
import { createMeetingSchema, toMeetingPayload, uploadTranscriptSchema } from '@/features/meetings/schemas/meeting.schemas';

describe('meeting.schemas', () => {
  it('validates create meeting form', () => {
    const result = createMeetingSchema.safeParse({
      title: 'Sprint Planning',
      meetingDate: '2026-06-15T10:00',
      durationMinutes: '60',
      attendeesInput: 'Alex, Jordan',
      tagsInput: 'sprint',
      agenda: 'Review goals',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Sprint Planning');
      expect(result.data.durationMinutes).toBe('60');
    }
  });

  it('rejects transcript shorter than minimum', () => {
    const result = uploadTranscriptSchema.safeParse({
      content: 'too short',
      sourceFormat: 'text',
    });

    expect(result.success).toBe(false);
  });

  it('parses comma-separated attendees and tags', () => {
    const payload = toMeetingPayload({
      title: 'Standup',
      meetingDate: '2026-06-15T10:00',
      attendeesInput: 'Alex, Jordan',
      tagsInput: 'sprint, daily',
    });

    expect(payload.attendees).toEqual(['Alex', 'Jordan']);
    expect(payload.tags).toEqual(['sprint', 'daily']);
  });
});
