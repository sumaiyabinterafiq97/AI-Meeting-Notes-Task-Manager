import { buildMockSummarizerOutput, buildMockTaskExtractorOutput } from '../../../src/modules/llm/fixtures/mock-responses';

describe('agent mock responses', () => {
  it('returns agent-specific structured outputs', () => {
    const summarizer = buildMockSummarizerOutput('Meeting title: Vendor Sync');
    expect(summarizer.summary).toContain('Vendor Sync');
    expect(summarizer.keyTopics.length).toBeGreaterThan(0);

    const tasks = buildMockTaskExtractorOutput();
    expect(tasks.actionItems.length).toBeGreaterThan(0);
  });
});
