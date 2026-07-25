import { hybridRetriever } from '../../../src/modules/rag/retrievers/hybrid.retriever';
import { ragPipelineService } from '../../../src/modules/rag/services/rag-pipeline.service';
import { ragFallbackService } from '../../../src/modules/rag/services/rag-fallback.service';
import { promptBuilderService } from '../../../src/modules/rag/prompt-builders/prompt-builder.service';

describe('rag pipeline', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockPrompt() {
    jest.spyOn(promptBuilderService, 'build').mockReturnValue({
      messages: [{ role: 'system', content: 'system' }],
      totalTokens: 100,
      promptId: 'chat-agent',
      promptVersion: '1',
    });
  }

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

    mockPrompt();

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

  it('uses meeting corpus fallback for synthesis when hybrid and keyword are empty', async () => {
    jest.spyOn(hybridRetriever, 'retrieve').mockResolvedValue({
      chunks: [],
      cacheHit: false,
      retrievalMode: 'hybrid',
    });
    jest.spyOn(ragFallbackService, 'keywordFallback').mockResolvedValue({
      chunks: [],
      cacheHit: false,
      retrievalMode: 'keyword_only',
      latencyMs: 1,
    });
    jest.spyOn(ragFallbackService, 'meetingCorpusFallback').mockResolvedValue({
      chunks: [
        {
          id: 'sum-1',
          content: '30-day calisthenics roadmap for beginners.',
          meetingId: 'm1',
          sourceType: 'summary',
          similarity: 1,
          metadata: { meetingTitle: 'Test' },
        },
      ],
      cacheHit: false,
      retrievalMode: 'keyword_only',
      latencyMs: 2,
    });
    mockPrompt();

    const result = await ragPipelineService.execute({
      query: 'Summarize this meeting',
      workspaceId: '00000000-0000-0000-0000-000000000001',
      meetingId: '00000000-0000-0000-0000-000000000002',
      mode: 'hybrid',
      queryIntent: 'synthesis',
      topK: 8,
    });

    expect(ragFallbackService.meetingCorpusFallback).toHaveBeenCalled();
    expect(result.context.blocks.length).toBe(1);
    expect(result.degraded).toBe(true);
    expect(result.stages.some((s) => s.error === 'empty_results_meeting_corpus_fallback')).toBe(
      true,
    );
  });

  it('does not use meeting corpus fallback without meetingId', async () => {
    jest.spyOn(hybridRetriever, 'retrieve').mockResolvedValue({
      chunks: [],
      cacheHit: false,
      retrievalMode: 'hybrid',
    });
    jest.spyOn(ragFallbackService, 'keywordFallback').mockResolvedValue({
      chunks: [],
      cacheHit: false,
      retrievalMode: 'keyword_only',
      latencyMs: 1,
    });
    const corpusSpy = jest.spyOn(ragFallbackService, 'meetingCorpusFallback');
    mockPrompt();

    const result = await ragPipelineService.execute({
      query: 'Summarize this meeting',
      workspaceId: '00000000-0000-0000-0000-000000000001',
      mode: 'hybrid',
      queryIntent: 'synthesis',
    });

    expect(corpusSpy).not.toHaveBeenCalled();
    expect(result.context.blocks).toHaveLength(0);
  });

  it('does not use meeting corpus fallback for task_query', async () => {
    jest.spyOn(hybridRetriever, 'retrieve').mockResolvedValue({
      chunks: [],
      cacheHit: false,
      retrievalMode: 'hybrid',
    });
    jest.spyOn(ragFallbackService, 'keywordFallback').mockResolvedValue({
      chunks: [],
      cacheHit: false,
      retrievalMode: 'keyword_only',
      latencyMs: 1,
    });
    const corpusSpy = jest.spyOn(ragFallbackService, 'meetingCorpusFallback');
    mockPrompt();

    const result = await ragPipelineService.execute({
      query: 'Summarize the action items',
      workspaceId: '00000000-0000-0000-0000-000000000001',
      meetingId: '00000000-0000-0000-0000-000000000002',
      mode: 'keyword',
      queryIntent: 'task_query',
      sourceTypes: ['action_item'],
    });

    expect(corpusSpy).not.toHaveBeenCalled();
    expect(result.context.blocks).toHaveLength(0);
  });
});
