import { DashboardRecommendationDto } from './dashboard.dto';

interface MeetingRisk {
  text?: string;
  severity?: string;
}

function parseRisks(value: unknown): MeetingRisk[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is MeetingRisk => typeof item === 'object' && item !== null);
}

export function buildWorkspaceRecommendations(input: {
  pendingByMeeting: Array<{ meetingId: string; meetingTitle: string; count: number }>;
  meetingsWithRisks: Array<{ id: string; title: string; risks: unknown }>;
  overdueTasks: number;
  openTasks: number;
}): DashboardRecommendationDto[] {
  const recommendations: DashboardRecommendationDto[] = [];
  const seen = new Set<string>();

  for (const entry of input.pendingByMeeting) {
    if (entry.count === 0) {
      continue;
    }

    const id = `pending-${entry.meetingId}`;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);

    recommendations.push({
      id,
      type: 'action_item',
      title: 'Review pending action items',
      description: `${entry.count} extracted follow-up${entry.count === 1 ? '' : 's'} from "${entry.meetingTitle}" need review.`,
      priority: 'medium',
      meetingId: entry.meetingId,
      meetingTitle: entry.meetingTitle,
    });
  }

  for (const meeting of input.meetingsWithRisks) {
    for (const risk of parseRisks(meeting.risks)) {
      const severity = risk.severity ?? 'medium';
      if (severity !== 'high' && severity !== 'medium') {
        continue;
      }

      const text = String(risk.text ?? '').trim();
      if (!text) {
        continue;
      }

      const id = `risk-${meeting.id}-${text.slice(0, 40)}`;
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);

      recommendations.push({
        id,
        type: 'risk',
        title: 'Mitigate identified risk',
        description: text,
        priority: severity === 'high' ? 'high' : 'medium',
        meetingId: meeting.id,
        meetingTitle: meeting.title,
      });
    }
  }

  if (input.overdueTasks > 0) {
    recommendations.push({
      id: 'overdue-tasks',
      type: 'backlog',
      title: 'Address overdue tasks',
      description: `${input.overdueTasks} task${input.overdueTasks === 1 ? ' is' : 's are'} past due. Prioritize or reassign them.`,
      priority: 'high',
    });
  }

  if (input.openTasks > 10 && input.overdueTasks === 0) {
    recommendations.push({
      id: 'backlog-review',
      type: 'follow_up',
      title: 'Schedule a backlog review',
      description: `${input.openTasks} open tasks may benefit from a team triage session.`,
      priority: 'low',
    });
  }

  return recommendations.slice(0, 6);
}
