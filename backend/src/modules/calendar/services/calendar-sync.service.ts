import { MeetingSource, NotificationType } from '@prisma/client';
import { env } from '../../../config/env';
import { calendarRepository } from '../repositories/calendar.repository';
import { getCalendarProvider, useMockCalendar } from '../providers/calendar-provider.registry';
import {
  durationMinutesFromRange,
  extractAttendeeEmails,
  mapAttendeesToWorkspaceMembers,
} from './attendee-mapper.service';
import { notificationRepository } from '../../notifications/notification.repository';
import type { SyncConnectionResult } from '../types/calendar.types';
import { logActivity } from '../../../lib/activity-log';

function meetingSourceForProvider(provider: string): MeetingSource {
  return provider === 'GOOGLE' ? MeetingSource.GOOGLE_CALENDAR : MeetingSource.MICROSOFT_CALENDAR;
}

function syncWindow(): { timeMin: Date; timeMax: Date } {
  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - env.CALENDAR_SYNC_LOOKBACK_DAYS);
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + env.CALENDAR_SYNC_LOOKAHEAD_DAYS);
  return { timeMin, timeMax };
}

export class CalendarSyncService {
  async syncWorkspace(workspaceId: string): Promise<SyncConnectionResult[]> {
    const connections = await calendarRepository.listActiveConnections(workspaceId);
    const results: SyncConnectionResult[] = [];

    for (const connection of connections) {
      results.push(await this.syncConnection(connection.id));
    }

    await this.sendTranscriptReminders(workspaceId);
    return results;
  }

  async syncAllWorkspaces(): Promise<SyncConnectionResult[]> {
    const connections = await calendarRepository.listActiveConnections();
    const results: SyncConnectionResult[] = [];
    const workspaceIds = new Set<string>();

    for (const connection of connections) {
      results.push(await this.syncConnection(connection.id));
      workspaceIds.add(connection.workspaceId);
    }

    for (const workspaceId of workspaceIds) {
      await this.sendTranscriptReminders(workspaceId);
    }

    return results;
  }

  async syncConnection(connectionId: string): Promise<SyncConnectionResult> {
    const connection = await calendarRepository.findConnectionById(connectionId);

    if (!connection || connection.status === 'REVOKED' || !connection.syncEnabled) {
      return {
        connectionId,
        eventsFetched: 0,
        meetingsCreated: 0,
        meetingsUpdated: 0,
        remindersSent: 0,
      };
    }

    const provider = getCalendarProvider(connection.provider);
    let accessToken = calendarRepository.getAccessToken(connection);

    try {
      if (
        connection.tokenExpiresAt &&
        connection.tokenExpiresAt.getTime() <= Date.now() + 60_000
      ) {
        const refreshToken = calendarRepository.getRefreshToken(connection);
        if (!refreshToken && !useMockCalendar()) {
          throw new Error('Access token expired and no refresh token available');
        }
        if (refreshToken) {
          const refreshed = await provider.refreshAccessToken(refreshToken);
          await calendarRepository.updateTokens(connection.id, refreshed);
          accessToken = refreshed.accessToken;
        }
      }

      const { timeMin, timeMax } = syncWindow();
      const events = await provider.listEvents(accessToken, { timeMin, timeMax });
      const members = await calendarRepository.listWorkspaceMembers(connection.workspaceId);
      const memberRefs = members.map((member) => ({
        email: member.user.email,
        displayName: member.user.displayName,
      }));

      let meetingsCreated = 0;
      let meetingsUpdated = 0;

      for (const event of events) {
        if (event.isCancelled) {
          continue;
        }

        const attendeeEmails = extractAttendeeEmails(event.attendees);
        const attendees = mapAttendeesToWorkspaceMembers(event.attendees, memberRefs);
        const durationMinutes = durationMinutesFromRange(event.start, event.end);
        const agenda = [event.description, event.location].filter(Boolean).join('\n\n') || null;

        const syncedEvent = await calendarRepository.upsertSyncedEvent({
          connectionId: connection.id,
          workspaceId: connection.workspaceId,
          externalEventId: event.externalEventId,
          eventTitle: event.title,
          eventStart: event.start,
          eventEnd: event.end,
          attendeeEmails,
          eventPayload: {
            title: event.title,
            location: event.location,
          },
        });

        const existingMeeting = await calendarRepository.findMeetingByExternalEvent(
          connection.workspaceId,
          event.externalEventId,
        );

        if (existingMeeting) {
          if (existingMeeting.status === 'DRAFT' && !existingMeeting.transcript) {
            await calendarRepository.updateCalendarMeeting(existingMeeting.id, {
              title: event.title,
              meetingDate: event.start,
              durationMinutes,
              attendees,
              agenda,
            });
            meetingsUpdated += 1;
          }
          if (!syncedEvent.meetingId) {
            await calendarRepository.linkMeetingToSyncedEvent(syncedEvent.id, existingMeeting.id);
          }
          continue;
        }

        const meeting = await calendarRepository.createCalendarMeeting({
          workspaceId: connection.workspaceId,
          createdById: connection.connectedById,
          title: event.title,
          meetingDate: event.start,
          durationMinutes,
          attendees,
          agenda,
          source: meetingSourceForProvider(connection.provider),
          externalCalendarEventId: event.externalEventId,
          calendarConnectionId: connection.id,
        });

        await calendarRepository.linkMeetingToSyncedEvent(syncedEvent.id, meeting.id);
        meetingsCreated += 1;
      }

      await calendarRepository.markSyncResult(connection.id, { error: null });

      await logActivity({
        workspaceId: connection.workspaceId,
        actorId: connection.connectedById,
        action: 'calendar.synced',
        entityType: 'workspace',
        entityId: connection.workspaceId,
        metadata: {
          connectionId: connection.id,
          provider: connection.provider,
          eventsFetched: events.length,
          meetingsCreated,
          meetingsUpdated,
        },
      });

      return {
        connectionId: connection.id,
        eventsFetched: events.length,
        meetingsCreated,
        meetingsUpdated,
        remindersSent: 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Calendar sync failed';
      await calendarRepository.markSyncResult(connection.id, { error: message });
      throw error;
    }
  }

  async sendTranscriptReminders(workspaceId: string): Promise<number> {
    const graceCutoff = new Date(
      Date.now() - env.CALENDAR_REMINDER_GRACE_MINUTES * 60_000,
    );
    const events = await calendarRepository.listEventsNeedingReminder(workspaceId, graceCutoff);
    const members = await calendarRepository.listWorkspaceMembers(workspaceId);
    let remindersSent = 0;

    for (const syncedEvent of events) {
      if (!syncedEvent.meeting) {
        continue;
      }

      const attendeeEmails = Array.isArray(syncedEvent.attendeeEmails)
        ? (syncedEvent.attendeeEmails as string[])
        : [];

      const recipientIds = new Set<string>([syncedEvent.meeting.createdById]);
      for (const member of members) {
        if (attendeeEmails.includes(member.user.email.toLowerCase())) {
          recipientIds.add(member.user.id);
        }
      }

      const notifications = [...recipientIds].map((userId) => ({
        userId,
        workspaceId,
        type: NotificationType.MEETING_TRANSCRIPT_REMINDER,
        payload: {
          meetingId: syncedEvent.meeting!.id,
          meetingTitle: syncedEvent.eventTitle,
          eventEnd: syncedEvent.eventEnd,
        },
      }));

      await notificationRepository.createMany(notifications);
      await calendarRepository.markReminderSent(syncedEvent.id);
      remindersSent += notifications.length;
    }

    return remindersSent;
  }
}

export const calendarSyncService = new CalendarSyncService();
