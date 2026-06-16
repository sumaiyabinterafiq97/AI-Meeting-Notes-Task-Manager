import { ActionItemStatus } from '@prisma/client';
import { aiService } from '../../src/modules/ai/ai.service';
import { aiRepository } from '../../src/modules/ai/ai.repository';
import { meetingRepository } from '../../src/modules/meetings/meeting.repository';
import { workspaceRepository } from '../../src/modules/workspaces/workspace.repository';
import { AppError } from '../../src/utils/errors';

const workspaceId = '11111111-1111-1111-1111-111111111111';
const meetingId = '22222222-2222-2222-2222-222222222222';
const userId = '33333333-3333-3333-3333-333333333333';
const actionItemId = '44444444-4444-4444-4444-444444444444';

describe('AiService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('returns AI output for an existing meeting', async () => {
    jest.spyOn(meetingRepository, 'findMeetingInWorkspace').mockResolvedValue({
      id: meetingId,
    } as never);

    jest.spyOn(aiRepository, 'findAiOutputInWorkspace').mockResolvedValue({
      summary: 'Summary text',
      topics: ['Planning'],
      decisions: [],
      risks: [],
      processingStatus: 'COMPLETED',
      processedAt: new Date('2026-06-15T11:00:00.000Z'),
      modelVersion: 'mock',
      errorMessage: null,
    } as never);

    const result = await aiService.getAiOutput(workspaceId, meetingId);

    expect(result.summary).toBe('Summary text');
    expect(result.processingStatus).toBe('COMPLETED');
  });

  it('rejects accepting non-pending action items', async () => {
    jest.spyOn(meetingRepository, 'findMeetingInWorkspace').mockResolvedValue({
      id: meetingId,
    } as never);

    jest.spyOn(aiRepository, 'findActionItemsByIds').mockResolvedValue([
      {
        id: actionItemId,
        meetingId,
        title: 'Task',
        description: 'Details',
        suggestedAssigneeId: null,
        suggestedDueDate: null,
        status: ActionItemStatus.ACCEPTED,
        createdAt: new Date(),
      },
    ] as never);

    await expect(
      aiService.acceptActionItems(workspaceId, meetingId, userId, {
        actionItemIds: [actionItemId],
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('accepts pending action items and creates tasks', async () => {
    jest.spyOn(meetingRepository, 'findMeetingInWorkspace').mockResolvedValue({
      id: meetingId,
    } as never);

    jest.spyOn(aiRepository, 'findActionItemsByIds').mockResolvedValue([
      {
        id: actionItemId,
        meetingId,
        title: 'Follow up',
        description: 'Call vendor',
        suggestedAssigneeId: userId,
        suggestedDueDate: null,
        status: ActionItemStatus.PENDING,
        createdAt: new Date(),
      },
    ] as never);

    jest.spyOn(workspaceRepository, 'findMemberByUserId').mockResolvedValue({
      id: 'member-1',
      userId,
    } as never);

    jest.spyOn(aiRepository, 'acceptActionItems').mockResolvedValue([
      {
        created: true,
        task: {
          id: 'task-1',
          workspaceId,
          meetingId,
          actionItemId,
          title: 'Follow up',
          description: 'Call vendor',
          status: 'TODO',
          priority: 'MEDIUM',
          assigneeId: userId,
          dueDate: null,
          createdAt: new Date(),
        },
      },
    ] as never);

    const result = await aiService.acceptActionItems(workspaceId, meetingId, userId, {
      actionItemIds: [actionItemId],
    });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].actionItemId).toBe(actionItemId);
  });
});
