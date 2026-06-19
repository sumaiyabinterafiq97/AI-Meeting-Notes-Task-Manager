import { estimateTokens } from '../../lib/token-estimate';
import { chunkingService } from '../chunking/services/chunking.service';
import { embeddingService } from '../embeddings/services/embedding.service';
import { vectorRepository } from '../vector/repositories/vector.repository';

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
    const content = `${entry.title}\n\n${entry.content}`;
    const chunks = chunkingService.chunk([
      {
        content,
        sourceType: 'knowledge',
        sourceId: entry.id,
        meetingId: entry.sourceMeetingId ?? undefined,
        metadata: { knowledgeTitle: entry.title },
      },
    ]);

    if (chunks.length === 0) {
      return;
    }

    const texts = chunks.map((chunk) => chunk.content);
    const { embeddings, model } = await embeddingService.generateBatch(texts, entry.workspaceId);

    await vectorRepository.replaceSourceChunks({
      workspaceId: entry.workspaceId,
      sourceType: 'knowledge',
      sourceId: entry.id,
      chunks: chunks.map((chunk, index) => ({
        workspaceId: entry.workspaceId,
        meetingId: entry.sourceMeetingId ?? undefined,
        sourceType: 'knowledge' as const,
        sourceId: entry.id,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        tokenCount: chunk.tokenCount ?? estimateTokens(chunk.content),
        embedding: embeddings[index] ?? [],
        embeddingModel: model,
        metadata: chunk.metadata,
      })),
    });
  }
}

export const knowledgeEmbeddingService = new KnowledgeEmbeddingService();
