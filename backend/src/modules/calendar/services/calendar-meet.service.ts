import { CalendarProvider, MeetingSource } from '@prisma/client';
import { prisma } from '../../../config/database';
import { structuredLogger } from '../../observability/logging/structured-logger';
import { metricsService, METRIC_NAMES } from '../../observability';
import { decryptToken } from '../utils/token-crypto';
import { calendarRepository } from '../repositories/calendar.repository';
import { getCalendarProvider, useMockCalendar } from '../providers/calendar-provider.registry';
import type { CreatedCalendarEvent } from '../types/calendar.types';

export class CalendarMeetService {
  /**
   * Ensures workspace has an ACTIVE Google CalendarConnection, optionally
   * provisioning from the user's Google Sign-In tokens.
   */
  async ensureGoogleConnection(
    workspaceId: string,
    userId: string,
  ): Promise<{ connectionId: string } | null> {
    const existing = await calendarRepository.findConnection(workspaceId, CalendarProvider.GOOGLE);
    if (existing && existing.status === 'ACTIVE') {
      return { connectionId: existing.id };
    }

    if (useMockCalendar()) {
      const tokens = await getCalendarProvider(CalendarProvider.GOOGLE).exchangeCodeForTokens(
        'mock-code',
      );
      const connection = await calendarRepository.upsertConnection({
        workspaceId,
        connectedById: userId,
        provider: CalendarProvider.GOOGLE,
        tokens,
      });
      return { connectionId: connection.id };
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        googleAccessTokenEnc: true,
        googleRefreshTokenEnc: true,
        googleTokenExpiresAt: true,
        googleEmail: true,
      },
    });

    if (!user?.googleAccessTokenEnc && !user?.googleRefreshTokenEnc) {
      return null;
    }

    const connection = await calendarRepository.upsertConnection({
      workspaceId,
      connectedById: userId,
      provider: CalendarProvider.GOOGLE,
      tokens: {
        accessToken: user.googleAccessTokenEnc
          ? decryptToken(user.googleAccessTokenEnc)
          : 'pending-refresh',
        refreshToken: user.googleRefreshTokenEnc
          ? decryptToken(user.googleRefreshTokenEnc)
          : undefined,
        expiresAt: user.googleTokenExpiresAt ?? undefined,
        accountEmail: user.googleEmail ?? undefined,
      },
    });

    return { connectionId: connection.id };
  }

  async createMeetForMeeting(input: {
    workspaceId: string;
    userId: string;
    meetingId: string;
    title: string;
    meetingDate: Date;
    durationMinutes: number | null;
    attendees: string[];
    agenda: string | null;
  }): Promise<CreatedCalendarEvent | null> {
    const ensured = await this.ensureGoogleConnection(input.workspaceId, input.userId);
    if (!ensured) {
      return null;
    }

    const connection = await calendarRepository.findConnectionById(ensured.connectionId);
    if (!connection || connection.status !== 'ACTIVE') {
      return null;
    }

    const provider = getCalendarProvider(CalendarProvider.GOOGLE);
    let accessToken = calendarRepository.getAccessToken(connection);

    try {
      if (connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() <= Date.now() + 60_000) {
        const refreshToken = calendarRepository.getRefreshToken(connection);
        if (refreshToken) {
          const refreshed = await provider.refreshAccessToken(refreshToken);
          await calendarRepository.updateTokens(connection.id, refreshed);
          accessToken = refreshed.accessToken;
        }
      }

      const durationMs = (input.durationMinutes ?? 60) * 60_000;
      const end = new Date(input.meetingDate.getTime() + durationMs);

      const created = await provider.createEventWithMeet(accessToken, {
        title: input.title,
        description: input.agenda ?? undefined,
        start: input.meetingDate,
        end,
        attendeeEmails: input.attendees,
        reminderMinutes: 10,
      });

      await prisma.meeting.update({
        where: { id: input.meetingId },
        data: {
          externalCalendarEventId: created.externalEventId,
          calendarConnectionId: connection.id,
          meetUrl: created.meetUrl,
          calendarHtmlLink: created.htmlLink,
          source: MeetingSource.GOOGLE_CALENDAR,
        },
      });

      metricsService.incrementCounter(METRIC_NAMES.MEET_LINK_CREATED, {
        provider: 'GOOGLE',
        mock: useMockCalendar() ? 'true' : 'false',
      });

      return created;
    } catch (error) {
      // Compensating behavior: local meeting already exists; leave it without Meet link
      structuredLogger.warn(
        {
          event: 'meet_link.create_failed',
          workspaceId: input.workspaceId,
          meetingId: input.meetingId,
          message: error instanceof Error ? error.message : 'unknown',
        },
        'Google Meet link creation failed; local meeting retained',
      );
      return null;
    }
  }

  async workspaceHasGoogleCalendar(workspaceId: string): Promise<boolean> {
    if (useMockCalendar()) {
      return true;
    }
    const connection = await calendarRepository.findConnection(
      workspaceId,
      CalendarProvider.GOOGLE,
    );
    return Boolean(connection && connection.status === 'ACTIVE');
  }
}

export const calendarMeetService = new CalendarMeetService();
