import type { ContextBlock } from '../../../../src/modules/rag/types/rag.types';
import {
  enrichChatOutput,
  enrichStructuredChatOutput,
  mapChatCitations,
  isRefusalResponse,
  validateChatCitations,
  computeChatGrounded,
  stripChatCitationsForMerge,
} from '../../../../src/modules/agents/chat/services/chat-agent.validator';
import { EMPTY_CONTEXT_RESPONSE } from '../../../../src/modules/agents/chat/services/chat-agent.constants';

describe('chat-agent validator', () => {
  const contextBlocks: ContextBlock[] = [
    {
      citationIndex: 1,
      chunkId: '00000000-0000-0000-0000-000000000011',
      content: 'The team agreed to use OAuth 2.0 with PKCE for authentication.',
      meetingId: '00000000-0000-0000-0000-000000000001',
      meetingTitle: 'Auth Planning',
      metadata: {},
    },
    {
      citationIndex: 2,
      chunkId: '00000000-0000-0000-0000-000000000012',
      content: 'Launch target remains July 1 after the delay discussion.',
      meetingId: '00000000-0000-0000-0000-000000000002',
      meetingTitle: 'Launch Review',
      metadata: {},
    },
  ];

  it('maps inline citations to context blocks with claim text', () => {
    const content =
      '**Decisions on authentication** [CITATION-1]\n- Team agreed to OAuth 2.0 [CITATION-1]\n- Launch remains July 1 [CITATION-2]';

    const citations = mapChatCitations(content, contextBlocks);

    expect(citations).toHaveLength(2);
    expect(citations[0].chunkId).toBe('00000000-0000-0000-0000-000000000011');
    expect(citations[0].meetingTitle).toBe('Auth Planning');
    expect(citations[0].claimText).toContain('CITATION-1');
  });

  it('detects refusal responses', () => {
    expect(isRefusalResponse(EMPTY_CONTEXT_RESPONSE)).toBe(true);
    expect(isRefusalResponse('Team agreed to OAuth 2.0 [CITATION-1]')).toBe(false);
  });

  it('enriches grounded answers with metadata', () => {
    const enriched = enrichChatOutput({
      content: 'OAuth 2.0 with PKCE was selected [CITATION-1].',
      contextBlocks,
      emptyContext: false,
      injectionDetected: false,
    });

    expect(enriched.grounded).toBe(true);
    expect(enriched.refusalReason).toBeNull();
    expect(enriched.citations).toHaveLength(1);
  });

  it('marks empty-context refusals as not grounded', () => {
    const enriched = enrichChatOutput({
      content: EMPTY_CONTEXT_RESPONSE,
      contextBlocks: [],
      emptyContext: true,
      injectionDetected: false,
    });

    expect(enriched.grounded).toBe(false);
    expect(enriched.refusalReason).toBe('empty_context');
  });

  it('validates orphan citation indices', () => {
    const validation = validateChatCitations(
      'Unknown fact [CITATION-9]',
      [{ index: 9, chunkId: 'missing', excerpt: '' }],
      contextBlocks,
    );

    expect(validation.orphanCitationIndices).toContain(9);
  });

  it('computes grounded state from citations and context', () => {
    expect(
      computeChatGrounded(
        [{ index: 1, chunkId: 'c1', excerpt: 'OAuth' }],
        contextBlocks,
        false,
        'OAuth decision [CITATION-1]',
      ),
    ).toBe(true);

    expect(computeChatGrounded([], [], true, EMPTY_CONTEXT_RESPONSE)).toBe(false);
  });

  it('strips v2.1 claimText for merge', () => {
    const stripped = stripChatCitationsForMerge([
      {
        index: 1,
        chunkId: 'c1',
        excerpt: 'OAuth',
        claimText: 'OAuth 2.0 with PKCE was selected [CITATION-1].',
      },
    ]);

    expect(stripped[0].claimText).toBeUndefined();
  });

  it('merges structured citations with context block metadata', () => {
    const enriched = enrichStructuredChatOutput({
      parsed: {
        content: 'OAuth 2.0 with PKCE was selected [CITATION-1].',
        citations: [
          {
            index: 1,
            chunkId: '00000000-0000-0000-0000-000000000011',
            claimText: 'OAuth 2.0 with PKCE was selected',
          },
        ],
        grounded: true,
        refusalReason: null,
      },
      contextBlocks,
      emptyContext: false,
    });

    expect(enriched.citations[0].meetingTitle).toBe('Auth Planning');
    expect(enriched.citations[0].claimText).toBe('OAuth 2.0 with PKCE was selected');
    expect(enriched.grounded).toBe(true);
  });
});
