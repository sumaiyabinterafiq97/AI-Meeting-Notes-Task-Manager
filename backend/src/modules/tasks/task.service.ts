import { TaskPriority, TaskStatus, WorkspaceRole } from '@prisma/client';
import {
  BoardQuery,
  CreateCommentDto,
  CreateTaskDto,
  DeleteTaskContext,
  DONE_BOARD_LIMIT,
  MAX_TASKS_PER_WORKSPACE,
  TaskDetailDto,
  TaskDto,
  TaskListQuery,
  UpdateTaskDto,
  CommentDto,
} from './task.dto';
import { taskRepository } from './task.repository';
import { workspaceRepository } from '../workspaces/workspace.repository';
import { notificationService } from '../notifications/notification.service';
import { parseMentions } from '../../lib/mentions';
import { logActivity } from '../../lib/activity-log';
import { AppError, ErrorCodes } from '../../utils/errors';
import { parsePagination, buildPaginationMeta } from '../../lib/pagination';

function toTaskDto(task: {
  id: string;
  workspaceId: string;
  meetingId: string | null;
  actionItemId: string | null;
  createdById: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: Date | null;
  position: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): TaskDto {
  return {
    id: task.id,
    workspaceId: task.workspaceId,
    meetingId: task.meetingId,
    actionItemId: task.actionItemId,
    createdById: task.createdById,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate,
    position: task.position,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function toCommentDto(comment: {
  id: string;
  taskId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  };
}): CommentDto {
  return {
    id: comment.id,
    taskId: comment.taskId,
    content: comment.content,
    author: comment.author,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

function parseDueDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid dueDate format');
  }
  return date;
}

export class TaskService {
  private async assertAssignee(workspaceId: string, assigneeId: string) {
    const member = await workspaceRepository.findMemberByUserId(workspaceId, assigneeId);
    if (!member) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Assignee must be a workspace member');
    }
  }

  private async assertTaskLimit(workspaceId: string) {
    const count = await taskRepository.countActiveTasks(workspaceId);
    if (count >= MAX_TASKS_PER_WORKSPACE) {
      throw new AppError(
        409,
        ErrorCodes.CONFLICT,
        `Workspace task limit of ${MAX_TASKS_PER_WORKSPACE} reached`,
      );
    }
  }

  async createTask(
    workspaceId: string,
    userId: string,
    data: CreateTaskDto,
  ): Promise<TaskDto> {
    await this.assertTaskLimit(workspaceId);

    if (data.assigneeId) {
      await this.assertAssignee(workspaceId, data.assigneeId);
    }

    if (data.meetingId) {
      const meeting = await taskRepository.findMeetingInWorkspace(workspaceId, data.meetingId);
      if (!meeting) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Meeting not found');
      }
    }

    const position = (await taskRepository.getMaxPosition(workspaceId, TaskStatus.TODO)) + 1;

    const task = await taskRepository.createTask({
      workspaceId,
      createdById: userId,
      title: data.title.trim(),
      description: data.description?.trim(),
      assigneeId: data.assigneeId,
      dueDate: data.dueDate ? parseDueDate(data.dueDate) : undefined,
      priority: data.priority,
      meetingId: data.meetingId,
      position,
    });

    if (task.assigneeId) {
      await notificationService.notifyTaskAssigned({
        assigneeId: task.assigneeId,
        workspaceId,
        taskId: task.id,
        taskTitle: task.title,
        assignedById: userId,
      });
    }

    await logActivity({
      workspaceId,
      actorId: userId,
      action: 'task.created',
      entityType: 'task',
      entityId: task.id,
      metadata: { title: task.title },
    });

    return toTaskDto(task);
  }

  async listTasks(workspaceId: string, query: TaskListQuery) {
    const pagination = parsePagination(query);

    const { items, total } = await taskRepository.listTasks(workspaceId, pagination, {
      status: query.status,
      assigneeId: query.assigneeId,
      priority: query.priority,
      search: query.search?.trim(),
    });

    return {
      data: items.map(toTaskDto),
      meta: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async getBoard(workspaceId: string, query: BoardQuery) {
    const doneLimitRaw = query.doneLimit
      ? Number.parseInt(query.doneLimit, 10)
      : DONE_BOARD_LIMIT;
    const doneLimit = Number.isFinite(doneLimitRaw)
      ? Math.min(Math.max(1, doneLimitRaw), 100)
      : DONE_BOARD_LIMIT;

    const board = await taskRepository.getBoard(workspaceId, query.assigneeId, doneLimit);

    return {
      TODO: board.TODO.map(toTaskDto),
      IN_PROGRESS: board.IN_PROGRESS.map(toTaskDto),
      DONE: board.DONE.map(toTaskDto),
    };
  }

  async getTask(workspaceId: string, taskId: string): Promise<TaskDetailDto> {
    const task = await taskRepository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Task not found');
    }

    return {
      ...toTaskDto(task),
      meeting: task.meeting,
      assignee: task.assignee,
      commentsCount: task._count.comments,
    };
  }

  async updateTask(
    workspaceId: string,
    taskId: string,
    userId: string,
    data: UpdateTaskDto,
  ): Promise<TaskDto> {
    const existing = await taskRepository.findTaskInWorkspace(workspaceId, taskId);
    if (!existing) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Task not found');
    }

    if (data.assigneeId) {
      await this.assertAssignee(workspaceId, data.assigneeId);
    }

    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) {
      updateData.title = data.title.trim();
    }
    if (data.description !== undefined) {
      updateData.description = data.description?.trim() ?? null;
    }
    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? parseDueDate(data.dueDate) : null;
    }
    if (data.assigneeId !== undefined) {
      updateData.assigneeId = data.assigneeId;
    }
    if (data.position !== undefined) {
      updateData.position = data.position;
    }

    let statusChange:
      | { fromStatus: TaskStatus; toStatus: TaskStatus; changedById: string }
      | undefined;

    if (data.status !== undefined && data.status !== existing.status) {
      updateData.status = data.status;

      if (data.status === TaskStatus.DONE) {
        updateData.completedAt = new Date();
      } else {
        updateData.completedAt = null;
      }

      statusChange = {
        fromStatus: existing.status,
        toStatus: data.status,
        changedById: userId,
      };
    }

    const updated = await taskRepository.updateTask(
      workspaceId,
      taskId,
      updateData,
      statusChange,
    );

    const assigneeChanged =
      data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId;

    if (assigneeChanged && data.assigneeId) {
      await notificationService.notifyTaskAssigned({
        assigneeId: data.assigneeId,
        workspaceId,
        taskId: updated.id,
        taskTitle: updated.title,
        assignedById: userId,
      });
    }

    if (statusChange) {
      await logActivity({
        workspaceId,
        actorId: userId,
        action: statusChange.toStatus === TaskStatus.DONE ? 'task.completed' : 'task.status_changed',
        entityType: 'task',
        entityId: taskId,
        metadata: {
          title: updated.title,
          fromStatus: statusChange.fromStatus,
          toStatus: statusChange.toStatus,
        },
      });
    }

    return toTaskDto(updated);
  }

  async deleteTask(
    workspaceId: string,
    taskId: string,
    context: DeleteTaskContext,
  ): Promise<void> {
    const task = await taskRepository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Task not found');
    }

    const isCreator = task.createdById === context.userId;
    const isOwner = context.role === WorkspaceRole.OWNER;

    if (!isCreator && !isOwner) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Task not found');
    }

    await taskRepository.softDeleteTask(workspaceId, taskId);

    await logActivity({
      workspaceId,
      actorId: context.userId,
      action: 'task.deleted',
      entityType: 'task',
      entityId: taskId,
    });
  }

  async createComment(
    workspaceId: string,
    taskId: string,
    userId: string,
    data: CreateCommentDto,
  ): Promise<CommentDto> {
    const task = await taskRepository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Task not found');
    }

    const comment = await taskRepository.createComment({
      taskId,
      authorId: userId,
      content: data.content.trim(),
    });

    const members = await taskRepository.listMemberUsers(workspaceId);
    const mentionedUserIds = parseMentions(
      data.content,
      members.map((m) => m.user),
      userId,
    );

    if (mentionedUserIds.length > 0) {
      await notificationService.notifyTaskMentions({
        mentionedUserIds,
        workspaceId,
        taskId,
        taskTitle: task.title,
        commentId: comment.id,
        authorId: userId,
      });
    }

    return toCommentDto(comment);
  }

  async listComments(workspaceId: string, taskId: string) {
    const task = await taskRepository.findTaskInWorkspace(workspaceId, taskId);
    if (!task) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Task not found');
    }

    const comments = await taskRepository.listComments(taskId);
    return {
      data: comments.map(toCommentDto),
    };
  }
}

export const taskService = new TaskService();
