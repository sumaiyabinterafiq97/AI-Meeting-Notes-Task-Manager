import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '../services/notification-api';
import { notificationKeys } from './notification-keys';

const POLL_INTERVAL_MS = 30_000;

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.list({ page: 1, limit: 20 }),
    queryFn: async () => {
      const { data } = await notificationApi.list({ page: 1, limit: 20 });
      return data;
    },
    enabled,
    refetchInterval: enabled ? POLL_INTERVAL_MS : false,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const { data } = await notificationApi.list({ unreadOnly: true, page: 1, limit: 1 });
      return data.meta.total;
    },
    refetchInterval: POLL_INTERVAL_MS,
  });
}
