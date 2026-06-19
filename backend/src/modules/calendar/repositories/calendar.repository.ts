import { CalendarConnectionStatus, CalendarProvider, MeetingSource, Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { encryptToken, decryptToken } from '../utils/token-crypto';
import type { OAuthTokens } from '../types/calendar.types';

export class CalendarRepository {
  async findConnectionById(connectionId: string) {
    return prisma.calendarConnection.findUnique({ where: { id: connectionId } });
  }

  async findConnection(workspaceId: string, provider: CalendarProvider) {
    return prisma.calendarConnection.findUnique({
      where: {
        workspaceId_provider: { workspaceId, provider },
      },
    });
  }

  async listConnections(workspaceId: string) {
    return prisma.calendarConnection.findMany({
      where: { workspaceId, status: { not: CalendarConnectionStatus.REVOKED } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listActiveConnections(workspaceId?: string) {
    return prisma.calendarConnection.findMany({
      where: {
        status: CalendarConnectionStatus.ACTIVE,
        syncEnabled: true,
        ...(workspaceId && { workspaceId }),
      },
    });
  }

  async upsertConnection(data: {
    workspaceId: string;
    connectedById: string;
    provider: CalendarProvider;
    tokens: OAuthTokens;
  }) {
    return prisma.calendarConnection.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: data.workspaceId,
          provider: data.provider,
        },
      },
      create: {
        workspaceId: data.workspaceId,
        connectedById: data.connectedById,
        provider: data.provider,
        status: CalendarConnectionStatus.ACTIVE,
        accessTokenEnc: encryptToken(data.tokens.accessToken),
        refreshTokenEnc: data.tokens.refreshToken
          ? encryptToken(data.tokens.refreshToken)
          : null,
        tokenExpiresAt: data.tokens.expiresAt ?? null,
        accountEmail: data.tokens.accountEmail ?? null,
        lastSyncError: null,
      },
      update: {
        connectedById: data.connectedById,
        status: CalendarConnectionStatus.ACTIVE,
        accessTokenEnc: encryptToken(data.tokens.accessToken),
        refreshTokenEnc: data.tokens.refreshToken
          ? encryptToken(data.tokens.refreshToken)
          : undefined,
        tokenExpiresAt: data.tokens.expiresAt ?? null,
        accountEmail: data.tokens.accountEmail ?? null,
        lastSyncError: null,
      },
    });
  }

  async revokeConnection(connectionId: string, workspaceId: string) {
    return prisma.calendarConnection.update({
      where: { id: connectionId, workspaceId },
      data: { status: CalendarConnectionStatus.REVOKED, syncEnabled: false },
    });
  }

  async updateTokens(connectionId: string, tokens: OAuthTokens) {
    return prisma.calendarConnection.update({
      where: { id: connectionId },
      data: {
        accessTokenEnc: encryptToken(tokens.accessToken),
        ...(tokens.refreshToken && { refreshTokenEnc: encryptToken(tokens.refreshToken) }),
        tokenExpiresAt: tokens.expiresAt ?? null,
        status: CalendarConnectionStatus.ACTIVE,
        lastSyncError: null,
      },
    });
  }

  async markSyncResult(
    connectionId: string,
    data: { error?: string | null; syncedAt?: Date },
  ) {
    return prisma.calendarConnection.update({
      where: { id: connectionId },
      data: {
        lastSyncAt: data.syncedAt ?? new Date(),
        lastSyncError: data.error ?? null,
        ...(data.error && { status: CalendarConnectionStatus.ERROR }),
        ...(!data.error && { status: CalendarConnectionStatus.ACTIVE }),
      },
    });
  }

  getAccessToken(connection: { accessTokenEnc: string }): string {
    return decryptToken(connection.accessTokenEnc);
  }

  getRefreshToken(connection: { refreshTokenEnc: string | null }): string | null {
    return connection.refreshTokenEnc ? decryptToken(connection.refreshTokenEnc) : null;
  }

  async upsertSyncedEvent(data: {
    connectionId: string;
    workspaceId: string;
    externalEventId: string;
    eventTitle: string;
    eventStart: Date;
    eventEnd: Date | null;
    attendeeEmails: string[];
    eventPayload: Prisma.InputJsonValue;
  }) {
    return prisma.calendarSyncedEvent.upsert({
      where: {
        connectionId_externalEventId: {
          connectionId: data.connectionId,
          externalEventId: data.externalEventId,
        },
      },
      create: {
        connectionId: data.connectionId,
        workspaceId: data.workspaceId,
        externalEventId: data.externalEventId,
        eventTitle: data.eventTitle,
        eventStart: data.eventStart,
        eventEnd: data.eventEnd,
        attendeeEmails: data.attendeeEmails,
        eventPayload: data.eventPayload,
      },
      update: {
        eventTitle: data.eventTitle,
        eventStart: data.eventStart,
        eventEnd: data.eventEnd,
        attendeeEmails: data.attendeeEmails,
        eventPayload: data.eventPayload,
        lastSeenAt: new Date(),
      },
      include: { meeting: true },
    });
  }

  async linkMeetingToSyncedEvent(syncedEventId: string, meetingId: string) {
    return prisma.calendarSyncedEvent.update({
      where: { id: syncedEventId },
      data: { meetingId },
    });
  }

  async createCalendarMeeting(data: {
    workspaceId: string;
    createdById: string;
    title: string;
    meetingDate: Date;
    durationMinutes: number | null;
    attendees: string[];
    agenda: string | null;
    source: MeetingSource;
    externalCalendarEventId: string;
    calendarConnectionId: string;
  }) {
    return prisma.meeting.create({
      data: {
        workspaceId: data.workspaceId,
        createdById: data.createdById,
        title: data.title,
        meetingDate: data.meetingDate,
        durationMinutes: data.durationMinutes,
        attendees: data.attendees,
        tags: ['calendar-sync'],
        agenda: data.agenda,
        source: data.source,
        externalCalendarEventId: data.externalCalendarEventId,
        calendarConnectionId: data.calendarConnectionId,
        status: 'DRAFT',
      },
    });
  }

  async updateCalendarMeeting(
    meetingId: string,
    data: {
      title: string;
      meetingDate: Date;
      durationMinutes: number | null;
      attendees: string[];
      agenda: string | null;
    },
  ) {
    return prisma.meeting.update({
      where: { id: meetingId },
      data: {
        title: data.title,
        meetingDate: data.meetingDate,
        durationMinutes: data.durationMinutes,
        attendees: data.attendees,
        agenda: data.agenda,
      },
    });
  }

  async findMeetingByExternalEvent(workspaceId: string, externalEventId: string) {
    return prisma.meeting.findFirst({
      where: { workspaceId, externalCalendarEventId: externalEventId, deletedAt: null },
      include: { transcript: { select: { id: true } } },
    });
  }

  async listWorkspaceMembers(workspaceId: string) {
    return prisma.workspaceMember.findMany({
      where: { workspaceId, user: { deletedAt: null } },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
    });
  }

  async listEventsNeedingReminder(workspaceId: string, graceCutoff: Date) {
    return prisma.calendarSyncedEvent.findMany({
      where: {
        workspaceId,
        reminderSentAt: null,
        eventEnd: { lte: graceCutoff },
        meeting: {
          deletedAt: null,
          status: 'DRAFT',
          transcript: { is: null },
        },
      },
      include: {
        meeting: {
          include: {
            transcript: { select: { id: true } },
          },
        },
      },
    });
  }

  async markReminderSent(syncedEventId: string) {
    return prisma.calendarSyncedEvent.update({
      where: { id: syncedEventId },
      data: { reminderSentAt: new Date() },
    });
  }
}

export const calendarRepository = new CalendarRepository();
