import { CalendarProvider } from '@prisma/client';
import { calendarRepository } from '../repositories/calendar.repository';
import { getCalendarProvider, useMockCalendar } from '../providers/calendar-provider.registry';
import { calendarOAuthService } from './calendar-oauth.service';
import { enqueueCalendarSync } from '../../../jobs/queue';
import { logActivity } from '../../../lib/activity-log';
import { AppError, ErrorCodes } from '../../../utils/errors';
import type {
  CalendarConnectionDto,
  CalendarSyncStatusDto,
  SyncConnectionResult,
} from '../types/calendar.types';

function toConnectionDto(connection: {
  id: string;
  workspaceId: string;
  provider: CalendarProvider;
  status: string;
  accountEmail: string | null;
  syncEnabled: boolean;
  lastSyncAt: Date | null;
  lastSyncError: string | null;
  connectedById: string;
  createdAt: Date;
}): CalendarConnectionDto {
  return {
    id: connection.id,
    workspaceId: connection.workspaceId,
    provider: connection.provider,
    status: connection.status,
    accountEmail: connection.accountEmail,
    syncEnabled: connection.syncEnabled,
    lastSyncAt: connection.lastSyncAt,
    lastSyncError: connection.lastSyncError,
    connectedById: connection.connectedById,
    createdAt: connection.createdAt,
  };
}

export class CalendarService {
  async listConnections(workspaceId: string): Promise<CalendarConnectionDto[]> {
    const connections = await calendarRepository.listConnections(workspaceId);
    return connections.map(toConnectionDto);
  }

  async getSyncStatus(workspaceId: string): Promise<CalendarSyncStatusDto> {
    const connections = await this.listConnections(workspaceId);
    const lastSyncAt = connections.reduce<Date | null>((latest, connection) => {
      if (!connection.lastSyncAt) {
        return latest;
      }
      if (!latest || connection.lastSyncAt > latest) {
        return connection.lastSyncAt;
      }
      return latest;
    }, null);

    return { workspaceId, connections, lastSyncAt };
  }

  async startOAuth(
    workspaceId: string,
    userId: string,
    provider: CalendarProvider,
  ): Promise<{ authorizationUrl: string; mock?: boolean }> {
    if (useMockCalendar()) {
      const tokens = await getCalendarProvider(provider).exchangeCodeForTokens('mock-code');
      await calendarRepository.upsertConnection({
        workspaceId,
        connectedById: userId,
        provider,
        tokens,
      });

      await logActivity({
        workspaceId,
        actorId: userId,
        action: 'calendar.connected',
        entityType: 'workspace',
        entityId: workspaceId,
        metadata: { provider, mock: true },
      });

      await enqueueCalendarSync({ workspaceId });
      return { authorizationUrl: '', mock: true };
    }

    const state = calendarOAuthService.createState({ workspaceId, userId, provider });
    const authorizationUrl = getCalendarProvider(provider).buildAuthorizationUrl(state);
    return { authorizationUrl };
  }

  async handleOAuthCallback(
    provider: CalendarProvider,
    code: string,
    state: string,
  ): Promise<{ workspaceId: string }> {
    const payload = calendarOAuthService.verifyState(state);
    if (payload.provider !== provider) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'OAuth provider mismatch');
    }

    const tokens = await getCalendarProvider(provider).exchangeCodeForTokens(code);
    await calendarRepository.upsertConnection({
      workspaceId: payload.workspaceId,
      connectedById: payload.userId,
      provider,
      tokens,
    });

    await logActivity({
      workspaceId: payload.workspaceId,
      actorId: payload.userId,
      action: 'calendar.connected',
      entityType: 'workspace',
      entityId: payload.workspaceId,
      metadata: { provider },
    });

    await enqueueCalendarSync({ workspaceId: payload.workspaceId });
    return { workspaceId: payload.workspaceId };
  }

  async disconnect(
    workspaceId: string,
    connectionId: string,
    userId: string,
  ): Promise<void> {
    await calendarRepository.revokeConnection(connectionId, workspaceId);

    await logActivity({
      workspaceId,
      actorId: userId,
      action: 'calendar.disconnected',
      entityType: 'workspace',
      entityId: workspaceId,
      metadata: { connectionId },
    });
  }

  async triggerSync(
    workspaceId: string,
  ): Promise<{ queued: true } | { queued: false; results: SyncConnectionResult[] }> {
    return enqueueCalendarSync({ workspaceId });
  }
}

export const calendarService = new CalendarService();
