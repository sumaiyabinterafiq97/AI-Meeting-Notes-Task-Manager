import { prisma } from '../../../src/config/database';
import { reindexService } from '../../../src/modules/embeddings/services/reindex.service';
import { meetingEmbeddingService } from '../../../src/modules/embeddings/services/meeting-embedding.service';
import { ragCacheService } from '../../../src/modules/rag/services/rag-cache.service';

describe('reindex service', () => {
  const workspaceId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    jest.restoreAllMocks();
    ragCacheService.clearMemory();
  });

  it('re-embeds meetings in batches and invalidates retrieval cache', async () => {
    jest.spyOn(prisma.meeting, 'findMany').mockResolvedValue([
      { id: '00000000-0000-0000-0000-000000000010' },
      { id: '00000000-0000-0000-0000-000000000011' },
    ] as never);

    const refreshMeeting = jest
      .spyOn(meetingEmbeddingService, 'refreshMeeting')
      .mockResolvedValue({
        jobId: 'job-1',
        meetingId: '00000000-0000-0000-0000-000000000010',
        workspaceId,
        chunksStored: 3,
      });

    const invalidate = jest.spyOn(ragCacheService, 'invalidateWorkspace').mockResolvedValue();

    const result = await reindexService.reindexWorkspace({
      workspaceId,
      reason: 'admin',
    });

    expect(refreshMeeting).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith(workspaceId);
    expect(result).toMatchObject({
      workspaceId,
      meetingsProcessed: 2,
      meetingsFailed: 0,
      totalChunksStored: 6,
      totalMeetings: 2,
      reason: 'admin',
    });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
