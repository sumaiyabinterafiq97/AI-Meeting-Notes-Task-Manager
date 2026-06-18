import { useQuery } from '@tanstack/react-query';
import { workspaceApi } from '../services/workspace-api';
import { workspaceKeys } from './workspace-keys';

export function useWorkspace(workspaceId: string | undefined) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId ?? ''),
    queryFn: async () => {
      const { data } = await workspaceApi.getById(workspaceId!);
      return data;
    },
    enabled: Boolean(workspaceId),
  });
}
