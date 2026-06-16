import { WorkspaceRole } from '@prisma/client';
import { prisma } from '../../config/database';

export class WorkspaceRepository {
  async slugExists(slug: string): Promise<boolean> {
    const workspace = await prisma.workspace.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    return Boolean(workspace);
  }

  async countUserWorkspaces(userId: string): Promise<number> {
    return prisma.workspaceMember.count({
      where: {
        userId,
        workspace: { deletedAt: null },
      },
    });
  }

  async createWorkspaceWithOwner(data: {
    name: string;
    slug: string;
    description?: string;
    createdById: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          createdById: data.createdById,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: data.createdById,
          role: WorkspaceRole.OWNER,
        },
      });

      return workspace;
    });
  }

  async findWorkspacesForUser(userId: string) {
    return prisma.workspaceMember.findMany({
      where: {
        userId,
        workspace: { deletedAt: null },
      },
      include: {
        workspace: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { workspace: { createdAt: 'desc' } },
    });
  }

  async findActiveWorkspaceById(workspaceId: string) {
    return prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                deletedAt: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { members: true } },
      },
    });
  }

  async findActiveMembership(workspaceId: string, userId: string) {
    return prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        workspace: { deletedAt: null },
      },
    });
  }

  async updateWorkspace(
    workspaceId: string,
    data: { name?: string; slug?: string; description?: string | null },
  ) {
    return prisma.workspace.update({
      where: { id: workspaceId },
      data,
    });
  }

  async softDeleteWorkspace(workspaceId: string) {
    return prisma.workspace.update({
      where: { id: workspaceId },
      data: { deletedAt: new Date() },
    });
  }

  async findMemberByUserId(workspaceId: string, userId: string) {
    return prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async countOwners(workspaceId: string): Promise<number> {
    return prisma.workspaceMember.count({
      where: { workspaceId, role: WorkspaceRole.OWNER },
    });
  }

  async updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole) {
    return prisma.workspaceMember.update({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async removeMember(workspaceId: string, userId: string) {
    return prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });
  }

  async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, email: true },
    });
  }

  async findPendingInvitationByEmail(workspaceId: string, email: string) {
    return prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId,
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async createInvitation(data: {
    workspaceId: string;
    email: string;
    role: WorkspaceRole;
    tokenHash: string;
    invitedById: string;
    expiresAt: Date;
  }) {
    return prisma.workspaceInvitation.create({ data });
  }

  async listPendingInvitations(workspaceId: string) {
    return prisma.workspaceInvitation.findMany({
      where: {
        workspaceId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findInvitationByTokenHash(tokenHash: string) {
    return prisma.workspaceInvitation.findFirst({
      where: { tokenHash },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true, deletedAt: true },
        },
      },
    });
  }

  async markInvitationAccepted(tokenHash: string) {
    return prisma.workspaceInvitation.updateMany({
      where: { tokenHash, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });
  }

  async addMember(workspaceId: string, userId: string, role: WorkspaceRole) {
    return prisma.workspaceMember.create({
      data: { workspaceId, userId, role },
    });
  }
}

export const workspaceRepository = new WorkspaceRepository();
