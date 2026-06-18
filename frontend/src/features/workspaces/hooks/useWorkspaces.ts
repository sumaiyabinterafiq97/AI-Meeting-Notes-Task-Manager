import { useQuery } from '@tanstack/react-query';
import { workspaceApi } from '../services/workspace-api';
import { workspaceKeys } from './workspace-keys';

export function useWorkspaces(enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.lists(),
    queryFn: async () => {
      const { data } = await workspaceApi.list();
      return data.data;
    },
    enabled,
  });
}
