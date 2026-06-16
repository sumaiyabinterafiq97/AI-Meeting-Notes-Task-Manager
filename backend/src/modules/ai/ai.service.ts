import { ActionItemStatus, Prisma } from '@prisma/client';
import {
  AcceptActionItemsDto,
  ActionItemDto,
  AiOutputDto,
  RejectActionItemsDto,
  TaskFromActionItemDto,
  UpdateAiOutputDto,
} from './ai.dto';
import { aiRepository } from './ai.repository';
import { meetingRepository } from '../meetings/meeting.repository';
import { workspaceRepository } from '../workspaces/workspace.repository';
import { notificationService } from '../notifications/notification.service';
import { AppError, ErrorCodes } from '../../utils/errors';

function toAiOutputDto(output: {
  summary: string | null;
  topics: unknown;
  decisions: unknown;
  risks: unknown;
  processingStatus: AiOutputDto['processingStatus'];
  processedAt: Date | null;
  modelVersion: string | null;
  errorMessage?: string | null;
}): AiOutputDto {
  return {
    summary: output.summary,
    topics: Array.isArray(output.topics) ? (output.topics as string[]) : [],
    decisions: Array.isArray(output.decisions) ? output.decisions : [],
    risks: Array.isArray(output.risks) ? output.risks : [],
    processingStatus: output.processingStatus,
    processedAt: output.processedAt,
    modelVersion: output.modelVersion,
    ...(output.errorMessage && { errorMessage: output.errorMessage }),
  };
}

function toActionItemDto(item: {
  id: string;
  meetingId: string;
  title: string;
  description: string | null;
  suggestedAssigneeId: string | null;
  suggestedDueDate: Date | null;
  status: ActionItemStatus;
  createdAt: Date;
}): ActionItemDto {
  return {
    id: item.id,
    meetingId: item.meetingId,
    title: item.title,
    description: item.description,
    suggestedAssigneeId: item.suggestedAssigneeId,
    suggestedDueDate: item.suggestedDueDate,
    status: item.status,
    createdAt: item.createdAt,
  };
}

function toTaskDto(task: {
  id: string;
  workspaceId: string;
  meetingId: string | null;
  actionItemId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: string | null;
  dueDate: Date | null;
  createdAt: Date;
}): TaskFromActionItemDto {
  return {
    id: task.id,
    workspaceId: task.workspaceId,
    meetingId: task.meetingId,
    actionItemId: task.actionItemId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate,
    createdAt: task.createdAt,
  };
}

function parseDueDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid dueDate format');
  }
  return date;
}

export class AiService {
  async getAiOutput(workspaceId: string, meetingId: string): Promise<AiOutputDto> {
    await this.assertMeetingExists(workspaceId, meetingId);

    const output = await aiRepository.findAiOutputInWorkspace(workspaceId, meetingId);
    if (!output) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'AI output not found');
    }

    return toAiOutputDto(output);
  }

  async updateAiOutput(
    workspaceId: string,
    meetingId: string,
    data: UpdateAiOutputDto,
  ): Promise<AiOutputDto> {
    await this.assertMeetingExists(workspaceId, meetingId);

    const updated = await aiRepository.updateAiOutput(workspaceId, meetingId, {
      ...(data.summary !== undefined && { summary: data.summary }),
      ...(data.topics !== undefined && { topics: data.topics }),
      ...(data.decisions !== undefined && {
        decisions: data.decisions as unknown as Prisma.InputJsonValue,
      }),
      ...(data.risks !== undefined && {
        risks: data.risks as unknown as Prisma.InputJsonValue,
      }),
    });

    if (!updated) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'AI output not found');
    }

    return toAiOutputDto(updated);
  }

  async listActionItems(workspaceId: string, meetingId: string) {
    await this.assertMeetingExists(workspaceId, meetingId);

    const items = await aiRepository.listActionItems(workspaceId, meetingId);
    return {
      data: items.map(toActionItemDto),
    };
  }

  async acceptActionItems(
    workspaceId: string,
    meetingId: string,
    userId: string,
    data: AcceptActionItemsDto,
  ) {
    await this.assertMeetingExists(workspaceId, meetingId);

    const actionItems = await aiRepository.findActionItemsByIds(
      workspaceId,
      meetingId,
      data.actionItemIds,
    );

    if (actionItems.length !== data.actionItemIds.length) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'One or more action items not found');
    }

    const nonPending = actionItems.filter((item) => item.status !== ActionItemStatus.PENDING);
    if (nonPending.length > 0) {
      throw new AppError(
        409,
        ErrorCodes.CONFLICT,
        'Only pending action items can be accepted',
      );
    }

    const overrideMap = new Map((data.overrides ?? []).map((override) => [override.id, override]));

    const itemsToCreate = [];

    for (const item of actionItems) {
      const override = overrideMap.get(item.id);
      const assigneeId = override?.assigneeId ?? item.suggestedAssigneeId;

      if (assigneeId) {
        const member = await workspaceRepository.findMemberByUserId(workspaceId, assigneeId);
        if (!member) {
          throw new AppError(
            400,
            ErrorCodes.VALIDATION_ERROR,
            'Assignee must be a workspace member',
          );
        }
      }

      itemsToCreate.push({
        actionItemId: item.id,
        title: (override?.title ?? item.title).slice(0, 300),
        description: item.description,
        assigneeId: assigneeId ?? null,
        dueDate: override?.dueDate
          ? parseDueDate(override.dueDate)
          : item.suggestedDueDate,
      });
    }

    const results = await aiRepository.acceptActionItems({
      workspaceId,
      meetingId,
      createdById: userId,
      items: itemsToCreate,
    });

    for (const { task, created } of results) {
      if (created && task.assigneeId) {
        await notificationService.notifyTaskAssigned({
          assigneeId: task.assigneeId,
          workspaceId,
          taskId: task.id,
          taskTitle: task.title,
          assignedById: userId,
        });
      }
    }

    return {
      tasks: results.map(({ task }) => toTaskDto(task)),
    };
  }

  async rejectActionItems(
    workspaceId: string,
    meetingId: string,
    data: RejectActionItemsDto,
  ) {
    await this.assertMeetingExists(workspaceId, meetingId);

    const actionItems = await aiRepository.findActionItemsByIds(
      workspaceId,
      meetingId,
      data.actionItemIds,
    );

    if (actionItems.length !== data.actionItemIds.length) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'One or more action items not found');
    }

    const rejected = await aiRepository.rejectActionItems(data.actionItemIds);
    return { rejected };
  }

  private async assertMeetingExists(workspaceId: string, meetingId: string): Promise<void> {
    const meeting = await meetingRepository.findMeetingInWorkspace(workspaceId, meetingId);
    if (!meeting) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Meeting not found');
    }
  }
}

export const aiService = new AiService();
