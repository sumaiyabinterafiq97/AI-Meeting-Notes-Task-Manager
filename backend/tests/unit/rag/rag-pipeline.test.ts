import { hybridRetriever } from '../../../src/modules/rag/retrievers/hybrid.retriever';
import { ragPipelineService } from '../../../src/modules/rag/services/rag-pipeline.service';
import { promptBuilderService } from '../../../src/modules/rag/prompt-builders/prompt-builder.service';

describe('rag pipeline', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('executes all pipeline stages and returns metrics', async () => {
    jest.spyOn(hybridRetriever, 'retrieve').mockResolvedValue({
      chunks: [
        {
          id: 'c1',
          content: 'Vendor API delivery discussed.',
          meetingId: 'm1',
          sourceType: 'transcript',
          sourceId: 's1',
          chunkIndex: 0,
          similarity: 0.88,
          metadata: { meetingTitle: 'Sync' },
        },
      ],
      cacheHit: false,
      retrievalMode: 'hybrid',
    });

    jest.spyOn(promptBuilderService, 'build').mockReturnValue({
      messages: [{ role: 'system', content: 'system' }],
      totalTokens: 100,
      promptId: 'chat-agent',
      promptVersion: '1',
    });

    const result = await ragPipelineService.execute(
      {
        query: 'What about vendor API?',
        workspaceId: '00000000-0000-0000-0000-000000000001',
        mode: 'hybrid',
        topK: 5,
      },
      [],
      { useCase: 'chat' },
    );

    expect(result.context.blocks.length).toBeGreaterThan(0);
    expect(result.context.formattedContext).toContain('[CITATION-1]');
    expect(result.prompt.messages.length).toBeGreaterThan(0);
    expect(result.stages.map((s) => s.stage)).toEqual([
      'query',
      'embed',
      'vector_search',
      'filter',
      'rank',
      'context',
      'prompt',
    ]);
    expect(result.degraded).toBe(false);
  });
});
