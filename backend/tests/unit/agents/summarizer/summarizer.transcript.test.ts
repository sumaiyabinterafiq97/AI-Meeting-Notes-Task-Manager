import {
  truncateTranscriptForAgent,
} from '../../../../src/modules/agents/shared/transcript.utils';
import { enrichSummarizerOutput } from '../../../../src/modules/agents/summarizer/services/summarizer.validator';

describe('summarizer transcript handling', () => {
  it('leaves short transcripts unchanged', () => {
    const transcript = 'Alex: We reviewed the roadmap.';
    const result = truncateTranscriptForAgent(transcript, 1_000);

    expect(result.truncated).toBe(false);
    expect(result.transcript).toBe(transcript);
  });

  it('truncates long transcripts with head and tail preserved', () => {
    const transcript = `${'A'.repeat(500)}${'B'.repeat(500)}`;
    const result = truncateTranscriptForAgent(transcript, 400);

    expect(result.truncated).toBe(true);
    expect(result.transcript).toContain('[... transcript truncated for processing ...]');
    expect(result.transcript.startsWith('A')).toBe(true);
    expect(result.transcript.endsWith('B')).toBe(true);
  });

  it('includes durationMinutes in enriched output', () => {
    const output = enrichSummarizerOutput(
      {
        summary: 'Team reviewed the roadmap.',
        keyTopics: ['roadmap'],
      },
      {
        transcript: 'Alex: We reviewed the roadmap.',
        meetingTitle: 'Planning',
        memberNames: ['Alex'],
        meetingDate: '2026-06-16',
        durationMinutes: 45,
      },
    );

    expect(output.durationMinutes).toBe(45);
  });
});
