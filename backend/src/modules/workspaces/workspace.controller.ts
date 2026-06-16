import { Request, Response, NextFunction } from 'express';
import { workspaceService } from './workspace.service';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  CreateInvitationDto,
  UpdateMemberRoleDto,
} from './workspace.dto';
import { routeParam } from '../../utils/route-param';

export class WorkspaceController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const data = req.body as CreateWorkspaceDto;
      const workspace = await workspaceService.createWorkspace(userId, data);
      res.status(201).json(workspace);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const workspaces = await workspaceService.listWorkspaces(userId);
      res.status(200).json({ data: workspaces });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspace = await workspaceService.getWorkspace(routeParam(req.params.workspaceId));
      res.status(200).json(workspace);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body as UpdateWorkspaceDto;
      const workspace = await workspaceService.updateWorkspace(
        routeParam(req.params.workspaceId),
        data,
      );
      res.status(200).json(workspace);
    } catch (error) {
      next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await workspaceService.deleteWorkspace(routeParam(req.params.workspaceId));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async createInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body as CreateInvitationDto;
      const invitation = await workspaceService.createInvitation(
        routeParam(req.params.workspaceId),
        req.user!.id,
        data,
      );
      res.status(201).json(invitation);
    } catch (error) {
      next(error);
    }
  }

  async listInvitations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invitations = await workspaceService.listInvitations(
        routeParam(req.params.workspaceId),
      );
      res.status(200).json({ data: invitations });
    } catch (error) {
      next(error);
    }
  }

  async listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const members = await workspaceService.listMembers(routeParam(req.params.workspaceId));
      res.status(200).json({ data: members });
    } catch (error) {
      next(error);
    }
  }

  async updateMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body as UpdateMemberRoleDto;
      const member = await workspaceService.updateMemberRole(
        routeParam(req.params.workspaceId),
        routeParam(req.params.userId),
        data,
      );
      res.status(200).json(member);
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await workspaceService.removeMember(
        routeParam(req.params.workspaceId),
        routeParam(req.params.userId),
        req.user!.id,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async acceptInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.acceptInvitation(
        routeParam(req.params.token),
        req.user!.id,
        req.user!.email,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const workspaceController = new WorkspaceController();
