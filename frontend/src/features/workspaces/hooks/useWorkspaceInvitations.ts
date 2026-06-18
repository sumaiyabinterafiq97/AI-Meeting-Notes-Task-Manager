import { useQuery } from '@tanstack/react-query';
import { workspaceApi } from '../services/workspace-api';
import { workspaceKeys } from './workspace-keys';

export function useWorkspaceInvitations(workspaceId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.invitations(workspaceId ?? ''),
    queryFn: async () => {
      const { data } = await workspaceApi.listInvitations(workspaceId!);
      return data.data;
    },
    enabled: Boolean(workspaceId) && enabled,
  });
}
