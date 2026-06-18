import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../services/notification-api';
import { notificationKeys } from './notification-keys';

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
