import type { ChatAgentOutput } from '../../../../src/modules/agents/chat/types/chat-agent.types';
import { normalizeChatOutputForMerge } from '../../../../src/modules/agents/services/output-normalizer.service';

describe('chat output normalizer', () => {
  it('strips claimText from citations for merge', () => {
    const output = normalizeChatOutputForMerge({
      content: 'OAuth 2.0 with PKCE was selected [CITATION-1].',
      citations: [
        {
          index: 1,
          chunkId: 'chunk-1',
          excerpt: 'OAuth 2.0 with PKCE was selected.',
          meetingId: '00000000-0000-0000-0000-000000000001',
          meetingTitle: 'Auth Planning',
          claimText: 'OAuth 2.0 with PKCE was selected [CITATION-1].',
        },
      ],
      grounded: true,
      refusalReason: null,
    } satisfies ChatAgentOutput);

    expect(output.citations[0].claimText).toBeUndefined();
    expect(output.grounded).toBe(true);
  });
});
