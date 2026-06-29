import type { ContextBlock } from '../../types/rag.types';
import type { RetrievedChunk } from '../../../retrievers/types/retriever.types';
import type { ContextCitationDto } from '../dto/context.dto';

/** Maps context blocks to citation DTOs for API and LLM response parsing. */
export class CitationMapperService {
  mapBlocks(blocks: ContextBlock[], chunks?: RetrievedChunk[]): ContextCitationDto[] {
    const chunkById = new Map(chunks?.map((c) => [c.id, c]) ?? []);

    return blocks.map((block) => {
      const source = block.chunkId ? chunkById.get(block.chunkId) : undefined;
      return {
        index: block.citationIndex,
        chunkId: block.chunkId,
        meetingId: block.meetingId,
        meetingTitle: block.meetingTitle,
        sourceType: source?.sourceType ?? (block.metadata.sourceType as string | undefined),
        excerpt: block.content.slice(0, 200),
        similarityScore: source?.similarity,
      };
    });
  }
}

export const citationMapperService = new CitationMapperService();
