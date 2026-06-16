import { MeetingStatus } from '@prisma/client';
import { MeetingService } from '../../src/modules/meetings/meeting.service';
import { meetingRepository } from '../../src/modules/meetings/meeting.repository';
import { AppError } from '../../src/utils/errors';
import * as activityLog from '../../src/lib/activity-log';

describe('MeetingService', () => {
  const service = new MeetingService();

  const mockMeeting = {
    id: 'meeting-1',
    workspaceId: 'ws-1',
    createdById: 'user-1',
    title: 'Standup',
    meetingDate: new Date('2026-06-15T10:00:00.000Z'),
    durationMinutes: 30,
    attendees: ['Alex'],
    tags: ['standup'],
    agenda: null,
    status: MeetingStatus.DRAFT,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    transcript: null,
    aiOutput: null,
    actionItems: [],
    tasks: [],
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('deleteMeeting', () => {
    it('allows creator to delete', async () => {
      jest.spyOn(meetingRepository, 'findMeetingInWorkspace').mockResolvedValue(mockMeeting);
      jest.spyOn(meetingRepository, 'softDeleteMeeting').mockResolvedValue({
        ...mockMeeting,
        deletedAt: new Date(),
      });
      jest.spyOn(activityLog, 'logActivity').mockResolvedValue({} as never);

      await expect(
        service.deleteMeeting('ws-1', 'meeting-1', {
          userId: 'user-1',
          role: 'MEMBER',
        }),
      ).resolves.toBeUndefined();
    });

    it('forbids non-creator member from deleting', async () => {
      jest.spyOn(meetingRepository, 'findMeetingInWorkspace').mockResolvedValue(mockMeeting);

      await expect(
        service.deleteMeeting('ws-1', 'meeting-1', {
          userId: 'user-2',
          role: 'MEMBER',
        }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('uploadTranscript', () => {
    it('rejects when meeting is already processing', async () => {
      jest.spyOn(meetingRepository, 'findMeetingInWorkspace').mockResolvedValue({
        ...mockMeeting,
        status: MeetingStatus.PROCESSING,
      });

      await expect(
        service.uploadTranscript('ws-1', 'meeting-1', {
          content: 'A'.repeat(120),
          sourceFormat: 'text',
        }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('rejects transcript below minimum length', async () => {
      jest.spyOn(meetingRepository, 'findMeetingInWorkspace').mockResolvedValue(mockMeeting);

      await expect(
        service.uploadTranscript('ws-1', 'meeting-1', {
          content: 'short',
          sourceFormat: 'text',
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('reprocessMeeting', () => {
    it('requires an existing transcript', async () => {
      jest.spyOn(meetingRepository, 'findMeetingInWorkspace').mockResolvedValue(mockMeeting);
      jest.spyOn(meetingRepository, 'hasTranscript').mockResolvedValue(false);

      await expect(service.reprocessMeeting('ws-1', 'meeting-1')).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });
});
