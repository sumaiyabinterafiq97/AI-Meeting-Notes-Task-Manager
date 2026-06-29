import {
  buildEmptyTranscriptOutput,
  computeSummarizerConfidence,
  enrichSummarizerOutput,
  extractSummarizerCitations,
  isTranscriptEmpty,
  validateSummarizerScope,
} from '../../../../src/modules/agents/summarizer/services/summarizer.validator';
import { EMPTY_TRANSCRIPT_SUMMARY } from '../../../../src/modules/agents/summarizer/services/summarizer.constants';

describe('summarizer validator', () => {
  const sampleInput = {
    transcript: [
      'Alex: Welcome to sprint planning.',
      'Jordan: API latency is still around 800ms p95.',
      'Alex: Let us schedule a perf deep-dive next week.',
    ].join('\n'),
    meetingTitle: 'Sprint Planning',
    memberNames: ['Alex', 'Jordan'],
    meetingDate: '2026-06-15',
  };

  it('detects empty transcripts', () => {
    expect(isTranscriptEmpty('   ')).toBe(true);
    expect(isTranscriptEmpty('Hello world')).toBe(false);
  });

  it('builds empty transcript output with full confidence', () => {
    const output = buildEmptyTranscriptOutput();
    expect(output.keyTopics).toEqual([]);
    expect(output.summary).toBe(EMPTY_TRANSCRIPT_SUMMARY);
    expect(output.confidenceScore).toBe(1);
  });

  it('flags scope violations in summary text', () => {
    const result = validateSummarizerScope('Alex was assigned to follow up on the action item.');
    expect(result.valid).toBe(false);
    expect(result.scopeViolations.length).toBeGreaterThan(0);
  });

  it('extracts citations from transcript lines', () => {
    const citations = extractSummarizerCitations(
      {
        summary: 'Team discussed API latency during sprint planning.',
        keyTopics: ['API latency', 'Sprint planning'],
      },
      sampleInput.transcript,
    );

    expect(citations.length).toBeGreaterThan(0);
    expect(citations[0].excerpt.length).toBeGreaterThan(0);
    expect(citations[0].speaker).toBeTruthy();
  });

  it('computes lower confidence when scope violations exist', () => {
    const base = computeSummarizerConfidence(
      { summary: 'Planning discussion.', keyTopics: ['Planning'] },
      sampleInput.transcript,
      [],
    );
    const penalized = computeSummarizerConfidence(
      { summary: 'Planning discussion.', keyTopics: ['Planning'] },
      sampleInput.transcript,
      ['action item'],
    );
    expect(penalized).toBeLessThan(base);
  });

  it('enriches raw LLM output with citations and confidence', () => {
    const enriched = enrichSummarizerOutput(
      {
        summary: 'The team reviewed sprint planning and discussed API latency.',
        keyTopics: ['Sprint planning', 'API latency'],
        nextSteps: ['Schedule perf deep-dive'],
      },
      sampleInput,
    );

    expect(enriched.citations?.length).toBeGreaterThan(0);
    expect(enriched.confidenceScore).toBeGreaterThan(0);
    expect(enriched.nextSteps).toEqual(['Schedule perf deep-dive']);
  });
});
