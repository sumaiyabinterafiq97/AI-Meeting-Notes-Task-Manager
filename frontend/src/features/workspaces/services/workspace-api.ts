import { apiClient } from '@/lib/api-client';
import type {
  AcceptInvitationResult,
  InvitationsListResponse,
  MembersListResponse,
  WorkspaceCreated,
  WorkspaceDetail,
  WorkspaceInvitation,
  WorkspacesListResponse,
} from '../types/workspace.types';
import type {
  CreateWorkspaceFormData,
  InviteMemberFormData,
  UpdateWorkspaceFormData,
} from '../schemas/workspace.schemas';
import type { WorkspaceRole } from '../types/workspace.types';

export const workspaceApi = {
  list: () => apiClient.get<WorkspacesListResponse>('/workspaces'),

  getById: (workspaceId: string) =>
    apiClient.get<WorkspaceDetail>(`/workspaces/${workspaceId}`),

  create: (data: CreateWorkspaceFormData) =>
    apiClient.post<WorkspaceCreated>('/workspaces', {
      name: data.name,
      ...(data.description ? { description: data.description } : {}),
    }),

  update: (workspaceId: string, data: UpdateWorkspaceFormData) =>
    apiClient.patch<WorkspaceDetail>(`/workspaces/${workspaceId}`, {
      name: data.name,
      description: data.description || null,
    }),

  delete: (workspaceId: string) => apiClient.delete(`/workspaces/${workspaceId}`),

  listMembers: (workspaceId: string) =>
    apiClient.get<MembersListResponse>(`/workspaces/${workspaceId}/members`),

  updateMemberRole: (workspaceId: string, userId: string, role: WorkspaceRole) =>
    apiClient.patch(`/workspaces/${workspaceId}/members/${userId}`, { role }),

  removeMember: (workspaceId: string, userId: string) =>
    apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`),

  listInvitations: (workspaceId: string) =>
    apiClient.get<InvitationsListResponse>(`/workspaces/${workspaceId}/invitations`),

  createInvitation: (workspaceId: string, data: InviteMemberFormData) =>
    apiClient.post<WorkspaceInvitation>(`/workspaces/${workspaceId}/invitations`, {
      email: data.email,
      role: 'MEMBER',
    }),

  acceptInvitation: (token: string) =>
    apiClient.post<AcceptInvitationResult>(`/invitations/${token}/accept`),
};
