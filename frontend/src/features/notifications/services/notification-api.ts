import { apiClient } from '@/lib/api-client';
import type {
  NotificationListFilters,
  NotificationPreferences,
  NotificationsListResponse,
} from '../types/notification.types';

export const notificationApi = {
  list: (filters: NotificationListFilters = {}) =>
    apiClient.get<NotificationsListResponse>('/notifications', {
      params: {
        ...filters,
        ...(filters.unreadOnly !== undefined && {
          unreadOnly: String(filters.unreadOnly),
        }),
      },
    }),

  markRead: (id: string) =>
    apiClient.patch<{ id: string; isRead: boolean }>(`/notifications/${id}/read`),

  markAllRead: () => apiClient.post<{ markedRead: number }>('/notifications/read-all'),

  getPreferences: () =>
    apiClient.get<NotificationPreferences>('/users/me/notification-preferences'),

  updatePreferences: (data: Partial<NotificationPreferences>) =>
    apiClient.patch<NotificationPreferences>('/users/me/notification-preferences', data),
};
