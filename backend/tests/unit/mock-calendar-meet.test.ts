import { MockCalendarProvider } from '../../src/modules/calendar/providers/mock-calendar.provider';

describe('MockCalendarProvider createEventWithMeet', () => {
  it('returns a fake meetUrl', async () => {
    const provider = new MockCalendarProvider('GOOGLE');
    const created = await provider.createEventWithMeet('token', {
      title: 'Demo',
      start: new Date(),
      end: new Date(Date.now() + 3600_000),
      attendeeEmails: ['a@example.com'],
    });

    expect(created.externalEventId).toMatch(/^mock-event-/);
    expect(created.meetUrl).toMatch(/^https:\/\/meet\.google\.com\/mock-/);
    expect(created.htmlLink).toContain('calendar.google.com');
  });
});
