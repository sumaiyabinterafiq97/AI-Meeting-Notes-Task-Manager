import { enqueueReindexWorkspace } from '../../../jobs/queue';
import { reindexService } from './reindex.service';
import type { ReindexReason } from './reindex-observability.service';
import type { ReindexWorkspaceResponseDto } from '../dto/reindex.dto';

/**
 * Background reindex orchestration — queue or inline processing.
 * @see docs/embedding-flow.md §7
 */
export class BackgroundReindexService {
  async enqueueWorkspaceReindex(
    workspaceId: string,
    reason?: ReindexReason,
  ): Promise<ReindexWorkspaceResponseDto> {
    const outcome = await enqueueReindexWorkspace({ workspaceId, reason });

    if (outcome.queued) {
      return { queued: true };
    }

    return {
      queued: false,
      result: {
        ...outcome.result,
        latencyMs: outcome.result.latencyMs ?? 0,
      },
    };
  }

  async reindexWorkspaceNow(workspaceId: string, reason?: ReindexReason) {
    return reindexService.reindexWorkspace({ workspaceId, reason });
  }
}

export const backgroundReindexService = new BackgroundReindexService();
