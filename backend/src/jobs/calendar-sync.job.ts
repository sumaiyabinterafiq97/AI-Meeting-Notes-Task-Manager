import { calendarSyncService } from '../modules/calendar/services/calendar-sync.service';
import type { SyncConnectionResult } from '../modules/calendar/types/calendar.types';

export async function processCalendarSyncJob(payload: {
  workspaceId?: string;
}): Promise<SyncConnectionResult[]> {
  if (payload.workspaceId) {
    return calendarSyncService.syncWorkspace(payload.workspaceId);
  }
  return calendarSyncService.syncAllWorkspaces();
}
