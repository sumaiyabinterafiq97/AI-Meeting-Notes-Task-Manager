import { Request, Response, NextFunction } from 'express';
import { WorkspaceRole } from '@prisma/client';
import { workspaceRepository } from '../modules/workspaces/workspace.repository';
import { AppError, ErrorCodes } from '../utils/errors';
import { routeParam } from '../utils/route-param';

export function requireWorkspaceMember(req: Request, _res: Response, next: NextFunction): void {
  const userId = req.user?.id;
  const workspaceId = routeParam(req.params.workspaceId);

  if (!userId) {
    next(new AppError(401, ErrorCodes.UNAUTHORIZED, 'Authentication required'));
    return;
  }

  if (!workspaceId) {
    next(new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Workspace ID is required'));
    return;
  }

  workspaceRepository
    .findActiveMembership(workspaceId, userId)
    .then((membership) => {
      if (!membership) {
        next(new AppError(404, ErrorCodes.NOT_FOUND, 'Workspace not found'));
        return;
      }

      req.workspace = {
        id: workspaceId,
        role: membership.role,
        membershipId: membership.id,
      };
      next();
    })
    .catch(() => {
      next(new AppError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to verify workspace membership'));
    });
}

export function requireRole(roles: WorkspaceRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.workspace) {
      next(new AppError(403, ErrorCodes.FORBIDDEN, 'Workspace context required'));
      return;
    }

    if (!roles.includes(req.workspace.role)) {
      next(new AppError(403, ErrorCodes.FORBIDDEN, 'Insufficient permissions'));
      return;
    }

    next();
  };
}
