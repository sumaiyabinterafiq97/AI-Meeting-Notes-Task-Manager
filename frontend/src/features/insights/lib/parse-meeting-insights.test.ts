import { describe, it, expect } from 'vitest';
import {
  buildMeetingRecommendations,
  parseDecisions,
  parseMeetingInsights,
  parseRisks,
} from './parse-meeting-insights';

describe('parse-meeting-insights', () => {
  it('parses decisions and risks from AI output', () => {
    const decisions = parseDecisions([
      { text: 'Ship Friday', context: 'Team consensus' },
      { text: '', context: 'ignored' },
    ]);
    const risks = parseRisks([
      { text: 'Vendor delay', severity: 'high', context: 'API dependency' },
      { text: 'Minor issue', severity: 'invalid', context: 'defaults to medium' },
    ]);

    expect(decisions).toHaveLength(1);
    expect(decisions[0]?.text).toBe('Ship Friday');
    expect(risks).toHaveLength(2);
    expect(risks[1]?.severity).toBe('medium');
  });

  it('builds recommendations from risks and pending actions', () => {
    const recommendations = buildMeetingRecommendations(
      [{ text: 'Vendor delay', severity: 'high', context: 'API' }],
      [{ text: 'Ship Friday', context: 'Consensus' }],
      [
        {
          id: '1',
          meetingId: 'm1',
          title: 'Follow up',
          description: null,
          suggestedAssigneeId: null,
          suggestedDueDate: null,
          status: 'PENDING',
          createdAt: '2026-01-01',
        },
      ],
    );

    expect(recommendations.some((item) => item.title.includes('Mitigate'))).toBe(true);
    expect(recommendations.some((item) => item.title.includes('pending action'))).toBe(true);
  });

  it('parses full meeting insights payload', () => {
    const insights = parseMeetingInsights(
      {
        id: 'ai1',
        summary: 'Planning session',
        topics: ['Sprint', 'Launch'],
        decisions: [{ text: 'Delay launch', context: 'Risk review' }],
        risks: [],
        processingStatus: 'COMPLETED',
        processedAt: '2026-06-01T00:00:00.000Z',
        modelVersion: 'gpt-4o',
      },
      [],
    );

    expect(insights.summary).toBe('Planning session');
    expect(insights.topics).toEqual(['Sprint', 'Launch']);
    expect(insights.decisions).toHaveLength(1);
  });
});
