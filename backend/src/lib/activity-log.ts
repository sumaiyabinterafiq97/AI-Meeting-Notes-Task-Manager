import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export async function logActivity(data: {
  workspaceId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.activityLog.create({
    data: {
      workspaceId: data.workspaceId,
      actorId: data.actorId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: data.metadata ?? {},
    },
  });
}
