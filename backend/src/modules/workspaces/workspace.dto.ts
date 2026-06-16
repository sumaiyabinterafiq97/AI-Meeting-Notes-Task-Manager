import { WorkspaceRole } from '@prisma/client';

export interface CreateWorkspaceDto {
  name: string;
  description?: string;
}

export interface UpdateWorkspaceDto {
  name?: string;
  description?: string;
}

export interface CreateInvitationDto {
  email: string;
  role?: WorkspaceRole;
}

export interface UpdateMemberRoleDto {
  role: WorkspaceRole;
}

export interface WorkspaceListItemDto {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  memberCount: number;
  createdAt: Date;
}

export interface WorkspaceMemberDto {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: WorkspaceRole;
  joinedAt: Date;
}

export interface WorkspaceDetailDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  createdAt: Date;
  members: WorkspaceMemberDto[];
}

export interface WorkspaceCreatedDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  role: WorkspaceRole;
  createdAt: Date;
}

export interface WorkspaceUpdatedDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvitationDto {
  id: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: Date;
  createdAt: Date;
}

export interface AcceptInvitationResultDto {
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  role: WorkspaceRole;
}

export interface CreateInvitationResultDto extends InvitationDto {
  token?: string;
}
