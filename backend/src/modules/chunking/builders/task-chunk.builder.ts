import { prisma } from '../../../config/database';
import type { ChunkInput } from '../types/chunk.types';

export async function buildTaskChunkInputs(meetingId: string): Promise<ChunkInput[]> {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, deletedAt: null },
    include: {
      tasks: {
        where: { deletedAt: null },
        include: {
          comments: { where: { deletedAt: null }, take: 5, orderBy: { createdAt: 'desc' } },
          assignee: { select: { id: true, displayName: true } },
        },
      },
    },
  });

  if (!meeting) return [];

  const baseMetadata = {
    meetingTitle: meeting.title,
    meetingDate: meeting.meetingDate.toISOString(),
  };

  return meeting.tasks.map((task) => {
    const commentBlock = task.comments
      .map((comment) => comment.content.trim())
      .filter(Boolean)
      .join('\n');

    const content = [task.title, task.description, commentBlock].filter(Boolean).join('\n');

    return {
      content,
      sourceType: 'task' as const,
      sourceId: task.id,
      meetingId: meeting.id,
      metadata: {
        ...baseMetadata,
        assigneeId: task.assigneeId,
        assigneeName: task.assignee?.displayName,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate?.toISOString(),
        relatedActionItemId: task.actionItemId,
      },
    };
  });
}
