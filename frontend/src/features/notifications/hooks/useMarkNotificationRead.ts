import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../services/notification-api';
import { notificationKeys } from './notification-keys';

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
