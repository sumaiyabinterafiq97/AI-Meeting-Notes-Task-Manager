import type { RetrievedChunk } from '../../retrievers/types/retriever.types';

export class NoopReranker {
  async rerank(chunks: RetrievedChunk[], _query: string, topK: number): Promise<RetrievedChunk[]> {
    return chunks.slice(0, topK);
  }
}

export const noopReranker = new NoopReranker();
