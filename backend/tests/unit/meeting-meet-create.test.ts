import { MeetingStatus } from '@prisma/client';
import { MeetingService } from '../../src/modules/meetings/meeting.service';
import { meetingRepository } from '../../src/modules/meetings/meeting.repository';
import { calendarMeetService } from '../../src/modules/calendar/services/calendar-meet.service';
import * as activityLog from '../../src/lib/activity-log';

describe('MeetingService createMeeting + Meet link', () => {
  const service = new MeetingService();

  const baseMeeting = {
    id: 'meeting-1',
    workspaceId: 'ws-1',
    createdById: 'user-1',
    title: 'Planning',
    meetingDate: new Date('2026-07-20T15:00:00.000Z'),
    durationMinutes: 45,
    attendees: ['alex@example.com'],
    tags: [],
    agenda: null,
    status: MeetingStatus.DRAFT,
    source: 'MANUAL' as const,
    externalCalendarEventId: null,
    calendarConnectionId: null,
    meetUrl: null,
    calendarHtmlLink: null,
    startReminderSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(activityLog, 'logActivity').mockResolvedValue({} as never);
  });

  it('creates a local meeting and attaches mock Meet URL when Google path succeeds', async () => {
    jest.spyOn(meetingRepository, 'createMeeting').mockResolvedValue(baseMeeting);
    jest.spyOn(calendarMeetService, 'createMeetForMeeting').mockResolvedValue({
      externalEventId: 'evt-1',
      meetUrl: 'https://meet.google.com/mock-abc',
      htmlLink: 'https://calendar.google.com/event?eid=1',
    });
    jest.spyOn(meetingRepository, 'findMeetingById').mockResolvedValue({
      ...baseMeeting,
      meetUrl: 'https://meet.google.com/mock-abc',
      calendarHtmlLink: 'https://calendar.google.com/event?eid=1',
      externalCalendarEventId: 'evt-1',
      source: 'GOOGLE_CALENDAR',
    });
    jest.spyOn(calendarMeetService, 'workspaceHasGoogleCalendar').mockResolvedValue(true);

    const result = await service.createMeeting('ws-1', 'user-1', {
      title: 'Planning',
      meetingDate: '2026-07-20T15:00:00.000Z',
      durationMinutes: 45,
      attendees: ['alex@example.com'],
    });

    expect(result.meetUrl).toBe('https://meet.google.com/mock-abc');
    expect(calendarMeetService.createMeetForMeeting).toHaveBeenCalled();
  });

  it('still succeeds when Google Meet creation fails (compensating behavior)', async () => {
    jest.spyOn(meetingRepository, 'createMeeting').mockResolvedValue(baseMeeting);
    jest.spyOn(calendarMeetService, 'createMeetForMeeting').mockResolvedValue(null);
    jest.spyOn(meetingRepository, 'findMeetingById').mockResolvedValue(baseMeeting);
    jest.spyOn(calendarMeetService, 'workspaceHasGoogleCalendar').mockResolvedValue(false);

    const result = await service.createMeeting('ws-1', 'user-1', {
      title: 'Planning',
      meetingDate: '2026-07-20T15:00:00.000Z',
    });

    expect(result.id).toBe('meeting-1');
    expect(result.meetUrl).toBeNull();
    expect(result.googleCalendarConnected).toBe(false);
  });
});
