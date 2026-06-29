import { WorkspaceRole } from '@prisma/client';
import { backgroundReindexService } from '../embeddings/services/background-reindex.service';
import type { ReindexReason } from '../embeddings/services/reindex-observability.service';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  CreateInvitationDto,
  UpdateMemberRoleDto,
  WorkspaceListItemDto,
  WorkspaceDetailDto,
  WorkspaceCreatedDto,
  WorkspaceUpdatedDto,
  InvitationDto,
  AcceptInvitationResultDto,
  CreateInvitationResultDto,
  WorkspaceMemberDto,
} from './workspace.dto';
import { workspaceRepository } from './workspace.repository';
import { AppError, ErrorCodes } from '../../utils/errors';
import { generateUniqueSlug } from '../../lib/slug';
import { generateOpaqueToken, hashToken } from '../../lib/token';
import { env } from '../../config/env';
import { logActivity } from '../../lib/activity-log';
import {
  buildWorkspaceInvitationEmail,
  sendEmail,
} from '../../lib/email';

function toMemberDto(member: {
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  };
}): WorkspaceMemberDto {
  return {
    userId: member.user.id,
    displayName: member.user.displayName,
    email: member.user.email,
    avatarUrl: member.user.avatarUrl,
    role: member.role,
    joinedAt: member.joinedAt,
  };
}

export class WorkspaceService {
  async createWorkspace(userId: string, data: CreateWorkspaceDto): Promise<WorkspaceCreatedDto> {
    const workspaceCount = await workspaceRepository.countUserWorkspaces(userId);
    if (workspaceCount >= env.MAX_WORKSPACES_PER_USER) {
      throw new AppError(403, ErrorCodes.FORBIDDEN, 'Workspace limit reached');
    }

    const slug = await generateUniqueSlug(data.name, (candidate) =>
      workspaceRepository.slugExists(candidate),
    );

    const workspace = await workspaceRepository.createWorkspaceWithOwner({
      name: data.name.trim(),
      slug,
      description: data.description?.trim(),
      createdById: userId,
    });

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      role: WorkspaceRole.OWNER,
      createdAt: workspace.createdAt,
    };
  }

  async listWorkspaces(userId: string): Promise<WorkspaceListItemDto[]> {
    const memberships = await workspaceRepository.findWorkspacesForUser(userId);

    return memberships.map((membership) => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      role: membership.role,
      memberCount: membership.workspace._count.members,
      createdAt: membership.workspace.createdAt,
    }));
  }

  async getWorkspace(workspaceId: string): Promise<WorkspaceDetailDto> {
    const workspace = await workspaceRepository.findActiveWorkspaceById(workspaceId);
    if (!workspace) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Workspace not found');
    }

    const members = workspace.members
      .filter((member) => member.user.deletedAt === null)
      .map((member) => toMemberDto(member));

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      memberCount: workspace._count.members,
      createdAt: workspace.createdAt,
      members,
    };
  }

  async updateWorkspace(
    workspaceId: string,
    data: UpdateWorkspaceDto,
  ): Promise<WorkspaceUpdatedDto> {
    const workspace = await workspaceRepository.findActiveWorkspaceById(workspaceId);
    if (!workspace) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Workspace not found');
    }

    const updateData: { name?: string; slug?: string; description?: string | null } = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
      if (data.name.trim() !== workspace.name) {
        updateData.slug = await generateUniqueSlug(data.name, (candidate) =>
          workspaceRepository.slugExists(candidate),
        );
      }
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() ?? null;
    }

    const updated = await workspaceRepository.updateWorkspace(workspaceId, updateData);

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    const workspace = await workspaceRepository.findActiveWorkspaceById(workspaceId);
    if (!workspace) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Workspace not found');
    }

    await workspaceRepository.softDeleteWorkspace(workspaceId);
  }

  async createInvitation(
    workspaceId: string,
    invitedById: string,
    data: CreateInvitationDto,
  ): Promise<CreateInvitationResultDto> {
    const email = data.email.toLowerCase().trim();
    const role = data.role ?? WorkspaceRole.MEMBER;

    if (role !== WorkspaceRole.MEMBER) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Only MEMBER role can be invited');
    }

    const existingMember = await workspaceRepository.findUserByEmail(email);
    if (existingMember) {
      const membership = await workspaceRepository.findActiveMembership(
        workspaceId,
        existingMember.id,
      );
      if (membership) {
        throw new AppError(409, ErrorCodes.CONFLICT, 'User is already a workspace member');
      }
    }

    const pendingInvite = await workspaceRepository.findPendingInvitationByEmail(workspaceId, email);
    if (pendingInvite) {
      throw new AppError(409, ErrorCodes.CONFLICT, 'A pending invitation already exists for this email');
    }

    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + env.INVITATION_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    );

    const invitation = await workspaceRepository.createInvitation({
      workspaceId,
      email,
      role,
      tokenHash,
      invitedById,
      expiresAt,
    });

    const acceptUrl = `${env.FRONTEND_URL}/invitations/${rawToken}/accept`;
    const workspace = await workspaceRepository.findActiveWorkspaceById(workspaceId);
    await sendEmail({
      to: email,
      subject: `Invitation to join ${workspace?.name ?? 'a workspace'}`,
      html: buildWorkspaceInvitationEmail(workspace?.name ?? 'workspace', acceptUrl),
    });

    if (env.NODE_ENV === 'development' && !env.EMAIL_API_KEY) {
      console.info(`[workspace] Invitation token for ${email}: ${rawToken}`);
    }

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      ...(env.NODE_ENV === 'development' && { token: rawToken }),
    };
  }

  async listInvitations(workspaceId: string): Promise<InvitationDto[]> {
    const invitations = await workspaceRepository.listPendingInvitations(workspaceId);

    return invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    }));
  }

  async acceptInvitation(
    token: string,
    userId: string,
    userEmail: string,
  ): Promise<AcceptInvitationResultDto> {
    const tokenHash = hashToken(token);
    const invitation = await workspaceRepository.findInvitationByTokenHash(tokenHash);

    if (!invitation || invitation.acceptedAt) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Invalid invitation token');
    }

    if (invitation.expiresAt <= new Date()) {
      throw new AppError(410, ErrorCodes.INVITATION_EXPIRED, 'Invitation has expired');
    }

    if (invitation.workspace.deletedAt) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Workspace not found');
    }

    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new AppError(403, ErrorCodes.FORBIDDEN, 'Invitation email does not match your account');
    }

    const existingMembership = await workspaceRepository.findActiveMembership(
      invitation.workspaceId,
      userId,
    );
    if (existingMembership) {
      throw new AppError(409, ErrorCodes.CONFLICT, 'You are already a member of this workspace');
    }

    await workspaceRepository.addMember(invitation.workspaceId, userId, invitation.role);
    await workspaceRepository.markInvitationAccepted(tokenHash);

    await logActivity({
      workspaceId: invitation.workspaceId,
      actorId: userId,
      action: 'member.added',
      entityType: 'user',
      entityId: userId,
      metadata: { role: invitation.role },
    });

    return {
      workspace: {
        id: invitation.workspace.id,
        name: invitation.workspace.name,
        slug: invitation.workspace.slug,
      },
      role: invitation.role,
    };
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMemberDto[]> {
    const workspace = await workspaceRepository.findActiveWorkspaceById(workspaceId);
    if (!workspace) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Workspace not found');
    }

    return workspace.members
      .filter((member) => member.user.deletedAt === null)
      .map((member) => toMemberDto(member));
  }

  async updateMemberRole(
    workspaceId: string,
    targetUserId: string,
    data: UpdateMemberRoleDto,
  ): Promise<WorkspaceMemberDto> {
    const member = await workspaceRepository.findMemberByUserId(workspaceId, targetUserId);
    if (!member) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Member not found');
    }

    if (member.role === WorkspaceRole.OWNER && data.role === WorkspaceRole.MEMBER) {
      const ownerCount = await workspaceRepository.countOwners(workspaceId);
      if (ownerCount <= 1) {
        throw new AppError(
          400,
          ErrorCodes.VALIDATION_ERROR,
          'Workspace must have at least one owner',
        );
      }
    }

    const updated = await workspaceRepository.updateMemberRole(
      workspaceId,
      targetUserId,
      data.role,
    );

    return toMemberDto(updated);
  }

  async removeMember(workspaceId: string, targetUserId: string, actorId: string): Promise<void> {
    const member = await workspaceRepository.findMemberByUserId(workspaceId, targetUserId);
    if (!member) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Member not found');
    }

    if (member.role === WorkspaceRole.OWNER) {
      const ownerCount = await workspaceRepository.countOwners(workspaceId);
      if (ownerCount <= 1) {
        throw new AppError(
          400,
          ErrorCodes.VALIDATION_ERROR,
          'Cannot remove the last workspace owner',
        );
      }
    }

    await workspaceRepository.removeMember(workspaceId, targetUserId);

    await logActivity({
      workspaceId,
      actorId,
      action: 'member.removed',
      entityType: 'user',
      entityId: targetUserId,
    });
  }

  async reindexWorkspace(workspaceId: string, reason?: ReindexReason) {
    return backgroundReindexService.enqueueWorkspaceReindex(workspaceId, reason);
  }
}

export const workspaceService = new WorkspaceService();
