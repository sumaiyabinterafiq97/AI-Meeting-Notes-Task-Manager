import { useQuery } from '@tanstack/react-query';
import { workspaceApi } from '../services/workspace-api';
import { workspaceKeys } from './workspace-keys';

export function useWorkspaceMembers(workspaceId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId ?? ''),
    queryFn: async () => {
      const { data } = await workspaceApi.listMembers(workspaceId!);
      return data.data;
    },
    enabled: Boolean(workspaceId) && enabled,
  });
}
