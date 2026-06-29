import { reindexService } from '../modules/embeddings/services/reindex.service';
import type { ReindexReason } from '../modules/embeddings/services/reindex-observability.service';

export interface ReindexWorkspaceJobPayload {
  workspaceId: string;
  reason?: ReindexReason;
}

export async function processReindexWorkspaceJob(payload: ReindexWorkspaceJobPayload) {
  return reindexService.reindexWorkspace({
    workspaceId: payload.workspaceId,
    reason: payload.reason,
  });
}
