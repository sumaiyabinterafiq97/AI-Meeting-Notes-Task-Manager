import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../services/notification-api';
import { notificationKeys } from './notification-keys';
import type { NotificationPreferences } from '../types/notification.types';

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<NotificationPreferences>) => {
      const { data: updated } = await notificationApi.updatePreferences(data);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(notificationKeys.preferences(), updated);
    },
  });
}
