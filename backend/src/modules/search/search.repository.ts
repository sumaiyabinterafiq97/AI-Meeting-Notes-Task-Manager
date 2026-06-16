import { Prisma, TaskStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { PaginationParams } from '../../lib/pagination';
import { SearchType } from './search.dto';

const TASK_STATUSES = new Set<string>(Object.values(TaskStatus));

function buildMeetingWhere(workspaceId: string, q: string): Prisma.MeetingWhereInput {
  return {
    workspaceId,
    deletedAt: null,
    OR: [
      { title: { contains: q, mode: 'insensitive' } },
      { tags: { has: q } },
    ],
  };
}

function buildTaskWhere(workspaceId: string, q: string): Prisma.TaskWhereInput {
  const statusMatch = q.toUpperCase();
  const statusFilter = TASK_STATUSES.has(statusMatch)
    ? [{ status: statusMatch as TaskStatus }]
    : [];

  return {
    workspaceId,
    deletedAt: null,
    OR: [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      {
        assignee: {
          OR: [
            { displayName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
      },
      ...statusFilter,
    ],
  };
}

export class SearchRepository {
  async searchMeetings(
    workspaceId: string,
    q: string,
    pagination: PaginationParams,
  ) {
    const where = buildMeetingWhere(workspaceId, q);

    const [items, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        orderBy: { meetingDate: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
        select: {
          id: true,
          title: true,
          meetingDate: true,
          status: true,
          tags: true,
        },
      }),
      prisma.meeting.count({ where }),
    ]);

    return { items, total };
  }

  async searchTasks(workspaceId: string, q: string, pagination: PaginationParams) {
    const where = buildTaskWhere(workspaceId, q);

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.limit,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          assigneeId: true,
          dueDate: true,
        },
      }),
      prisma.task.count({ where }),
    ]);

    return { items, total };
  }

  async searchSummarySnippets(
    workspaceId: string,
    q: string,
    limit: number,
  ) {
    const meetings = await prisma.meeting.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        aiOutput: {
          summary: { contains: q, mode: 'insensitive' },
        },
      },
      take: limit,
      orderBy: { meetingDate: 'desc' },
      select: {
        id: true,
        title: true,
        aiOutput: {
          select: { summary: true },
        },
      },
    });

    return meetings
      .filter((meeting) => meeting.aiOutput?.summary)
      .map((meeting) => {
        const summary = meeting.aiOutput!.summary!;
        const lowerSummary = summary.toLowerCase();
        const lowerQ = q.toLowerCase();
        const index = lowerSummary.indexOf(lowerQ);
        const start = Math.max(0, index - 40);
        const end = Math.min(summary.length, index + q.length + 40);
        const excerpt =
          (start > 0 ? '…' : '') +
          summary.slice(start, end) +
          (end < summary.length ? '…' : '');

        return {
          meetingId: meeting.id,
          meetingTitle: meeting.title,
          field: 'summary',
          excerpt,
        };
      });
  }
}

export const searchRepository = new SearchRepository();

export function shouldSearchMeetings(type: SearchType): boolean {
  return type === 'meetings' || type === 'all';
}

export function shouldSearchTasks(type: SearchType): boolean {
  return type === 'tasks' || type === 'all';
}
