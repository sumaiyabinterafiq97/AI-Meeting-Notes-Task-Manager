import { promptBuilderService } from '../../../src/modules/rag/prompt-builders/prompt-builder.service';

describe('prompt-builder', () => {
  it('builds system, history, and user messages with context', () => {
    const prompt = promptBuilderService.build(
      'chat-agent',
      [
        {
          citationIndex: 1,
          chunkId: 'chunk-1',
          content: 'Vendor follow-up is required.',
          meetingId: 'm1',
          meetingTitle: 'Vendor Sync',
          metadata: {},
        },
      ],
      [{ role: 'user', content: 'What did we decide?' }],
      'What are the action items?',
    );

    expect(prompt.messages[0].role).toBe('system');
    expect(prompt.messages[0].content).toContain('MeetingMind AI');
    expect(prompt.messages.at(-1)?.content).toContain('What are the action items?');
    expect(prompt.messages.at(-1)?.content).toContain('[CITATION-1]');
    expect(prompt.totalTokens).toBeGreaterThan(0);
    expect(prompt.promptId).toBe('chat-agent');
  });
});
