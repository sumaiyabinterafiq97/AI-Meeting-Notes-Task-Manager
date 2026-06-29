import { estimateTokens } from '../../lib/token-estimate';
import { entityEmbeddingService } from '../embeddings/services/entity-embedding.service';

export class KnowledgeEmbeddingService {
  async embedEntry(
    entry: {
      id: string;
      workspaceId: string;
      sourceMeetingId?: string | null;
      title: string;
      content: string;
    },
  ): Promise<void> {
    await entityEmbeddingService.embedEntity({
      workspaceId: entry.workspaceId,
      sourceType: 'knowledge',
      sourceId: entry.id,
      meetingId: entry.sourceMeetingId ?? undefined,
      content: `${entry.title}\n\n${entry.content}`,
      metadata: {
        knowledgeTitle: entry.title,
        tokenCount: estimateTokens(`${entry.title}\n\n${entry.content}`),
      },
    });
  }
}

export const knowledgeEmbeddingService = new KnowledgeEmbeddingService();
