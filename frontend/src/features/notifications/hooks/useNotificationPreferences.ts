import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '../services/notification-api';
import { notificationKeys } from './notification-keys';

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: async () => {
      const { data } = await notificationApi.getPreferences();
      return data;
    },
  });
}
