import { ragFallbackService } from '../../../src/modules/rag/services/rag-fallback.service';
import { vectorRepository } from '../../../src/modules/vector/repositories/vector.repository';

describe('rag fallback meeting corpus', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows corpus fallback only for meeting-scoped synthesis/general/meeting_query', () => {
    expect(
      ragFallbackService.shouldUseMeetingCorpusFallback({
        query: 'Summarize',
        workspaceId: 'ws',
        meetingId: 'm1',
        queryIntent: 'synthesis',
      }),
    ).toBe(true);

    expect(
      ragFallbackService.shouldUseMeetingCorpusFallback({
        query: 'overview',
        workspaceId: 'ws',
        meetingId: 'm1',
        queryIntent: 'general',
      }),
    ).toBe(true);

    expect(
      ragFallbackService.shouldUseMeetingCorpusFallback({
        query: 'what was discussed',
        workspaceId: 'ws',
        meetingId: 'm1',
        queryIntent: 'meeting_query',
      }),
    ).toBe(true);

    expect(
      ragFallbackService.shouldUseMeetingCorpusFallback({
        query: 'Summarize',
        workspaceId: 'ws',
        queryIntent: 'synthesis',
      }),
    ).toBe(false);

    expect(
      ragFallbackService.shouldUseMeetingCorpusFallback({
        query: 'Summarize the action items',
        workspaceId: 'ws',
        meetingId: 'm1',
        queryIntent: 'task_query',
      }),
    ).toBe(false);

    expect(
      ragFallbackService.shouldUseMeetingCorpusFallback({
        query: 'What was decided?',
        workspaceId: 'ws',
        meetingId: 'm1',
        queryIntent: 'factual_lookup',
      }),
    ).toBe(false);
  });

  it('loads preferred meeting chunks when corpus fallback applies', async () => {
    jest.spyOn(vectorRepository, 'listByMeeting').mockResolvedValue([
      {
        id: 'sum-1',
        workspaceId: 'ws',
        meetingId: 'm1',
        sourceType: 'summary',
        sourceId: 's1',
        chunkIndex: 0,
        content: 'Calisthenics overview for beginners.',
        tokenCount: 10,
        metadata: { meetingTitle: 'Test' },
        similarity: 1,
      },
      {
        id: 'tr-1',
        workspaceId: 'ws',
        meetingId: 'm1',
        sourceType: 'transcript',
        sourceId: 't1',
        chunkIndex: 0,
        content: 'A to Z of calisthenics and a 30-day roadmap.',
        tokenCount: 20,
        metadata: { meetingTitle: 'Test' },
        similarity: 1,
      },
    ]);

    const result = await ragFallbackService.meetingCorpusFallback({
      query: 'Summarize this meeting',
      workspaceId: 'ws',
      meetingId: 'm1',
      queryIntent: 'synthesis',
      topK: 8,
      sourceTypes: ['transcript', 'summary'],
    });

    expect(result.chunks).toHaveLength(2);
    expect(result.chunks[0]?.sourceType).toBe('summary');
    expect(vectorRepository.listByMeeting).toHaveBeenCalledWith('m1', 'ws', {
      topK: 8,
      sourceTypes: ['transcript', 'summary'],
    });
  });

  it('returns empty when corpus fallback does not apply', async () => {
    const listSpy = jest.spyOn(vectorRepository, 'listByMeeting');

    const result = await ragFallbackService.meetingCorpusFallback({
      query: 'Summarize the action items',
      workspaceId: 'ws',
      meetingId: 'm1',
      queryIntent: 'task_query',
    });

    expect(result.chunks).toEqual([]);
    expect(listSpy).not.toHaveBeenCalled();
  });
});
