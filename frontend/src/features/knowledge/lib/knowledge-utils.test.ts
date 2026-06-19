import { describe, it, expect } from 'vitest';
import { filterKnowledgeEntries, getDecisionTimelineEntries } from './knowledge-utils';
import type { KnowledgeEntry } from '../types/knowledge.types';

const entries: KnowledgeEntry[] = [
  {
    id: '1',
    workspaceId: 'ws-1',
    sourceMeetingId: 'm-1',
    entityType: 'DECISION',
    title: 'Ship Friday',
    content: 'Team agreed to ship on Friday.',
    confidence: 0.9,
    createdAt: '2026-06-10T10:00:00.000Z',
    updatedAt: '2026-06-10T10:00:00.000Z',
  },
  {
    id: '2',
    workspaceId: 'ws-1',
    sourceMeetingId: 'm-2',
    entityType: 'PERSON',
    title: 'Vendor contact',
    content: 'Primary API contact is Alex.',
    confidence: 0.8,
    createdAt: '2026-06-12T10:00:00.000Z',
    updatedAt: '2026-06-12T10:00:00.000Z',
  },
];

describe('knowledge-utils', () => {
  it('filters entries by search text', () => {
    expect(filterKnowledgeEntries(entries, 'vendor')).toHaveLength(1);
  });

  it('returns decision entries for timeline', () => {
    expect(getDecisionTimelineEntries(entries)).toHaveLength(1);
  });
});
