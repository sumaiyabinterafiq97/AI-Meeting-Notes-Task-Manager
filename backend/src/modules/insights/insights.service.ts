import { TaskStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { llmService } from '../llm';
import { startOfUtcWeek, weeksAgoUtc } from '../../lib/week';

export interface WorkspaceInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  metric?: Record<string, number>;
}

export class InsightsService {
  async getInsights(workspaceId: string): Promise<{
    insights: WorkspaceInsight[];
    narrative?: string;
    generatedAt: string;
  }> {
    const now = new Date();
    const weekStart = startOfUtcWeek(now);
    const fourWeeksAgo = weeksAgoUtc(4);

    const [meetingsThisWeek, meetingsPriorWeeks, tasksCreatedWeek, tasksCompletedWeek, overdueTasks] =
      await Promise.all([
        prisma.meeting.count({
          where: {
            workspaceId,
            deletedAt: null,
            meetingDate: { gte: weekStart },
          },
        }),
        prisma.meeting.count({
          where: {
            workspaceId,
            deletedAt: null,
            meetingDate: { gte: fourWeeksAgo, lt: weekStart },
          },
        }),
        prisma.task.count({
          where: {
            workspaceId,
            deletedAt: null,
            createdAt: { gte: weekStart },
          },
        }),
        prisma.task.count({
          where: {
            workspaceId,
            deletedAt: null,
            status: TaskStatus.DONE,
            completedAt: { gte: weekStart },
          },
        }),
        prisma.task.count({
          where: {
            workspaceId,
            deletedAt: null,
            status: { not: TaskStatus.DONE },
            dueDate: { lt: now },
          },
        }),
      ]);

    const avgMeetingsPerWeek = meetingsPriorWeeks / 4;
    const insights: WorkspaceInsight[] = [];

    insights.push({
      id: 'meetings-this-week',
      type: 'trend',
      title: 'Meetings this week',
      description: `${meetingsThisWeek} meetings held this week.`,
      metric: { count: meetingsThisWeek, rollingAvg: Math.round(avgMeetingsPerWeek * 10) / 10 },
    });

    if (avgMeetingsPerWeek > 0 && meetingsThisWeek > avgMeetingsPerWeek * 1.5) {
      insights.push({
        id: 'meeting-volume-spike',
        type: 'anomaly',
        title: 'Meeting volume spike',
        description: 'Meeting count is more than 50% above the 4-week average.',
        metric: { current: meetingsThisWeek, average: Math.round(avgMeetingsPerWeek) },
      });
    }

    insights.push({
      id: 'task-throughput',
      type: 'trend',
      title: 'Task throughput',
      description: `${tasksCompletedWeek} tasks completed vs ${tasksCreatedWeek} created this week.`,
      metric: { created: tasksCreatedWeek, completed: tasksCompletedWeek },
    });

    if (overdueTasks > 0) {
      insights.push({
        id: 'overdue-tasks',
        type: 'anomaly',
        title: 'Overdue tasks',
        description: `${overdueTasks} tasks are past due.`,
        metric: { overdue: overdueTasks },
      });
    }

    if (tasksCreatedWeek > tasksCompletedWeek + 3) {
      insights.push({
        id: 'task-backlog-growth',
        type: 'recommendation',
        title: 'Growing task backlog',
        description: 'More tasks were created than completed this week. Consider a backlog review.',
      });
    }

    let narrative: string | undefined;
    try {
      const response = await llmService.complete({
        workflow: 'weekly-report',
        messages: [
          {
            role: 'system',
            content:
              'Write a short paragraph (3-4 sentences) summarizing workspace productivity insights. Be factual and concise.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              meetingsThisWeek,
              avgMeetingsPerWeek: Math.round(avgMeetingsPerWeek * 10) / 10,
              tasksCreatedWeek,
              tasksCompletedWeek,
              overdueTasks,
            }),
          },
        ],
        workspaceId,
      });
      narrative = response.content;
    } catch {
      narrative = undefined;
    }

    return {
      insights,
      narrative,
      generatedAt: now.toISOString(),
    };
  }
}

export const insightsService = new InsightsService();
