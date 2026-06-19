import { buildWorkspaceRecommendations } from '@/modules/dashboard/dashboard-recommendations';

describe('buildWorkspaceRecommendations', () => {
  it('builds recommendations from pending actions and risks', () => {
    const recommendations = buildWorkspaceRecommendations({
      pendingByMeeting: [
        { meetingId: 'm-1', meetingTitle: 'Sprint Planning', count: 2 },
      ],
      meetingsWithRisks: [
        {
          id: 'm-2',
          title: 'Architecture Review',
          risks: [{ text: 'Vendor API may slip', severity: 'high' }],
        },
      ],
      overdueTasks: 0,
      openTasks: 4,
    });

    expect(recommendations.some((item) => item.type === 'action_item')).toBe(true);
    expect(recommendations.some((item) => item.type === 'risk' && item.priority === 'high')).toBe(
      true,
    );
  });

  it('prioritizes overdue task recommendation', () => {
    const recommendations = buildWorkspaceRecommendations({
      pendingByMeeting: [],
      meetingsWithRisks: [],
      overdueTasks: 3,
      openTasks: 10,
    });

    expect(recommendations[0]).toMatchObject({
      id: 'overdue-tasks',
      priority: 'high',
    });
  });
});
