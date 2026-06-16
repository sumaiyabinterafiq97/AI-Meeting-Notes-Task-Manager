import { WorkspaceRole } from '@prisma/client';
import { WorkspaceService } from '../../src/modules/workspaces/workspace.service';
import { workspaceRepository } from '../../src/modules/workspaces/workspace.repository';
import { AppError } from '../../src/utils/errors';
import * as slugLib from '../../src/lib/slug';

describe('WorkspaceService', () => {
  const service = new WorkspaceService();

  const mockWorkspace = {
    id: 'ws-1',
    name: 'Engineering',
    slug: 'engineering',
    description: 'Team workspace',
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(slugLib, 'generateUniqueSlug').mockResolvedValue('engineering');
  });

  describe('createWorkspace', () => {
    it('creates workspace when under limit', async () => {
      jest.spyOn(workspaceRepository, 'countUserWorkspaces').mockResolvedValue(0);
      jest.spyOn(workspaceRepository, 'createWorkspaceWithOwner').mockResolvedValue(mockWorkspace);

      const result = await service.createWorkspace('user-1', {
        name: 'Engineering',
        description: 'Team workspace',
      });

      expect(result.role).toBe(WorkspaceRole.OWNER);
      expect(result.slug).toBe('engineering');
    });

    it('throws when workspace limit reached', async () => {
      jest.spyOn(workspaceRepository, 'countUserWorkspaces').mockResolvedValue(10);

      await expect(
        service.createWorkspace('user-1', { name: 'Another Team' }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('updateMemberRole', () => {
    it('prevents demoting the last owner', async () => {
      jest.spyOn(workspaceRepository, 'findMemberByUserId').mockResolvedValue({
        id: 'm-1',
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: WorkspaceRole.OWNER,
        joinedAt: new Date(),
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          displayName: 'Owner',
          avatarUrl: null,
        },
      });
      jest.spyOn(workspaceRepository, 'countOwners').mockResolvedValue(1);

      await expect(
        service.updateMemberRole('ws-1', 'user-1', { role: WorkspaceRole.MEMBER }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('acceptInvitation', () => {
    it('rejects when invitation email does not match user', async () => {
      jest.spyOn(workspaceRepository, 'findInvitationByTokenHash').mockResolvedValue({
        id: 'inv-1',
        workspaceId: 'ws-1',
        email: 'other@example.com',
        role: WorkspaceRole.MEMBER,
        tokenHash: 'hash',
        invitedById: 'user-1',
        expiresAt: new Date(Date.now() + 60_000),
        acceptedAt: null,
        createdAt: new Date(),
        workspace: {
          id: 'ws-1',
          name: 'Engineering',
          slug: 'engineering',
          deletedAt: null,
        },
      });

      await expect(
        service.acceptInvitation('token', 'user-2', 'user@example.com'),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });
});
