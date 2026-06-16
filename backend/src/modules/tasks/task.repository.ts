import { Prisma, TaskPriority, TaskStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { PaginationParams } from '../../lib/pagination';
import { DONE_BOARD_LIMIT } from './task.dto';

const taskUserSelect = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
} as const;

const activeTaskWhere = {
  deletedAt: null,
} as const;

export class TaskRepository {
  async countActiveTasks(workspaceId: string): Promise<number> {
    return prisma.task.count({
      where: { workspaceId, ...activeTaskWhere },
    });
  }

  async findMeetingInWorkspace(workspaceId: string, meetingId: string) {
    return prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId, deletedAt: null },
      select: { id: true, title: true },
    });
  }

  async getMaxPosition(workspaceId: string, status: TaskStatus): Promise<number> {
    const result = await prisma.task.aggregate({
      where: { workspaceId, status, ...activeTaskWhere },
      _max: { position: true },
    });
    return result._max.position ?? -1;
  }

  async createTask(data: {
    workspaceId: string;
    createdById: string;
    title: string;
    description?: string | null;
    assigneeId?: string | null;
    dueDate?: Date | null;
    priority?: TaskPriority;
    meetingId?: string | null;
    actionItemId?: string | null;
    position: number;
  }) {
    return prisma.task.create({ data });
  }

  async findTaskInWorkspace(workspaceId: string, taskId: string) {
    return prisma.task.findFirst({
      where: { id: taskId, workspaceId, ...activeTaskWhere },
      include: {
        meeting: { select: { id: true, title: true } },
        assignee: { select: taskUserSelect },
        _count: { select: { comments: { where: { deletedAt: null } } } },
      },
    });
  }

  async listTasks(
    workspaceId: string,
    pagination: PaginationParams,
    filters: {
      status?: TaskStatus;
      assigneeId?: string;
      priority?: TaskPriority;
      search?: string;
    },
  ) {
    const where: Prisma.TaskWhereInput = {
      workspaceId,
      ...activeTaskWhere,
      ...(filters.status && { status: filters.status }),
      ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.search && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: [{ status: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.task.count({ where }),
    ]);

    return { items, total };
  }

  async getBoard(workspaceId: string, assigneeId?: string, doneLimit = DONE_BOARD_LIMIT) {
    const baseWhere: Prisma.TaskWhereInput = {
      workspaceId,
      ...activeTaskWhere,
      ...(assigneeId && { assigneeId }),
    };

    const orderBy: Prisma.TaskOrderByWithRelationInput[] = [
      { position: 'asc' },
      { createdAt: 'desc' },
    ];

    const [todo, inProgress, done] = await Promise.all([
      prisma.task.findMany({
        where: { ...baseWhere, status: TaskStatus.TODO },
        orderBy,
      }),
      prisma.task.findMany({
        where: { ...baseWhere, status: TaskStatus.IN_PROGRESS },
        orderBy,
      }),
      prisma.task.findMany({
        where: { ...baseWhere, status: TaskStatus.DONE },
        orderBy,
        take: doneLimit,
      }),
    ]);

    return {
      TODO: todo,
      IN_PROGRESS: inProgress,
      DONE: done,
    };
  }

  async updateTask(
    workspaceId: string,
    taskId: string,
    data: Prisma.TaskUpdateInput,
    statusChange?: {
      fromStatus: TaskStatus;
      toStatus: TaskStatus;
      changedById: string;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id: taskId },
        data,
      });

      if (statusChange) {
        await tx.taskStatusHistory.create({
          data: {
            taskId,
            fromStatus: statusChange.fromStatus,
            toStatus: statusChange.toStatus,
            changedById: statusChange.changedById,
          },
        });
      }

      return task;
    });
  }

  async softDeleteTask(workspaceId: string, taskId: string) {
    return prisma.task.updateMany({
      where: { id: taskId, workspaceId, ...activeTaskWhere },
      data: { deletedAt: new Date() },
    });
  }

  async listMemberUsers(workspaceId: string) {
    return prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: taskUserSelect,
        },
      },
    });
  }

  async createComment(data: { taskId: string; authorId: string; content: string }) {
    return prisma.comment.create({
      data,
      include: {
        author: { select: taskUserSelect },
      },
    });
  }

  async listComments(taskId: string) {
    return prisma.comment.findMany({
      where: { taskId, deletedAt: null },
      include: {
        author: { select: taskUserSelect },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export const taskRepository = new TaskRepository();
