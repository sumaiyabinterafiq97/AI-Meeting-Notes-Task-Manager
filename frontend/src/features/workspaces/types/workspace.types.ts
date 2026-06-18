export type WorkspaceRole = 'OWNER' | 'MEMBER';

export interface WorkspaceListItem {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  memberCount: number;
  createdAt: string;
}

export interface WorkspaceMember {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface WorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  createdAt: string;
  members: WorkspaceMember[];
}

export interface WorkspaceCreated {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  role: WorkspaceRole;
  createdAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: string;
  createdAt: string;
}

export interface AcceptInvitationResult {
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  role: WorkspaceRole;
}

export interface WorkspacesListResponse {
  data: WorkspaceListItem[];
}

export interface MembersListResponse {
  data: WorkspaceMember[];
}

export interface InvitationsListResponse {
  data: WorkspaceInvitation[];
}
