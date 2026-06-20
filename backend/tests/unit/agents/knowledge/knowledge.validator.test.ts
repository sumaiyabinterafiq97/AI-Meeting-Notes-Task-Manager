import type { KnowledgeEntryResult } from '../../../../src/modules/agents/knowledge/types/knowledge.types';
import {
  deduplicateKnowledgeEntries,
  enrichKnowledgeOutput,
  extractKnowledgeEvidence,
  normalizeEntityType,
  resolveSourceRef,
  buildEmptyTranscriptKnowledgeOutput,
} from '../../../../src/modules/agents/knowledge/services/knowledge.validator';

describe('knowledge validator', () => {
  const sampleInput = {
    workspaceId: '00000000-0000-0000-0000-000000000001',
    meetingId: '00000000-0000-0000-0000-000000000002',
    transcript: [
      'Alex: We defined RTO as a maximum of 4 hours for production database restore.',
      'Maria: Production deploys require engineering lead and on-call SRE approvals.',
    ].join('\n'),
    summary: 'Team aligned on recovery and deployment standards.',
    decisions: [{ text: 'Adopt 4-hour RTO', context: 'Database recovery policy' }],
    meetingTitle: 'Platform reliability review',
  };

  it('normalizes invalid entity types to other', () => {
    expect(normalizeEntityType('definition')).toBe('definition');
    expect(normalizeEntityType('invalid-type')).toBe('other');
  });

  it('deduplicates entries by normalized title', () => {
    const entries: KnowledgeEntryResult[] = [
      {
        entityType: 'definition',
        title: 'RTO',
        content: 'First',
        confidence: 0.9,
      },
      {
        entityType: 'definition',
        title: 'RTO.',
        content: 'Duplicate',
        confidence: 0.85,
      },
    ];

    expect(deduplicateKnowledgeEntries(entries)).toHaveLength(1);
  });

  it('extracts supporting evidence from transcript', () => {
    const evidence = extractKnowledgeEvidence(
      'RTO',
      'Recovery time objective for database restore',
      sampleInput.transcript,
    );

    expect(evidence.toLowerCase()).toContain('4 hours');
  });

  it('resolves sourceRef with meetingId and excerpt', () => {
    const sourceRef = resolveSourceRef(
      {
        entityType: 'technical',
        title: 'RTO',
        content: 'Maximum 4 hours for production database restore.',
        confidence: 0.9,
      },
      sampleInput,
    );

    expect(sourceRef.meetingId).toBe(sampleInput.meetingId);
    expect(sourceRef.excerpt.length).toBeGreaterThan(0);
    expect(sourceRef.excerpt.length).toBeLessThanOrEqual(300);
  });

  it('filters low-confidence entries during enrichment', () => {
    const enriched = enrichKnowledgeOutput(
      {
        entries: [
          {
            entityType: 'definition',
            title: 'RTO',
            content: 'Maximum 4 hours for production database restore.',
            confidence: 0.9,
          },
          {
            entityType: 'other',
            title: 'Maybe revisit mobile scope',
            content: 'Informal brainstorming only.',
            confidence: 0.4,
          },
        ],
      },
      sampleInput,
    );

    expect(enriched.entries).toHaveLength(1);
    expect(enriched.entries[0].title).toBe('RTO');
    expect(enriched.filteredCount).toBe(1);
    expect(enriched.averageConfidence).toBe(0.9);
  });

  it('returns empty output metadata for empty transcript helper', () => {
    expect(buildEmptyTranscriptKnowledgeOutput()).toEqual({
      entries: [],
      filteredCount: 0,
      averageConfidence: 1,
    });
  });
});
