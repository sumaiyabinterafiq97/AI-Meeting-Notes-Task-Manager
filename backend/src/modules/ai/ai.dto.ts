import { ActionItemStatus, AiProcessingStatus } from '@prisma/client';

export interface AiOutputDto {
  summary: string | null;
  topics: string[];
  decisions: unknown[];
  risks: unknown[];
  processingStatus: AiProcessingStatus;
  processedAt: Date | null;
  modelVersion: string | null;
  errorMessage?: string | null;
}

export interface UpdateAiOutputDto {
  summary?: string;
  topics?: string[];
  decisions?: unknown[];
  risks?: unknown[];
}

export interface ActionItemDto {
  id: string;
  meetingId: string;
  title: string;
  description: string | null;
  suggestedAssigneeId: string | null;
  suggestedDueDate: Date | null;
  status: ActionItemStatus;
  createdAt: Date;
}

export interface AcceptActionItemsDto {
  actionItemIds: string[];
  overrides?: ActionItemOverrideDto[];
}

export interface ActionItemOverrideDto {
  id: string;
  assigneeId?: string;
  dueDate?: string;
  title?: string;
}

export interface RejectActionItemsDto {
  actionItemIds: string[];
}

export interface TaskFromActionItemDto {
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
}
