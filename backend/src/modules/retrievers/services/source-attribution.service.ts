import { sourceCitationService } from '../../rag/citations/services/source-citation.service';
import type { SourceCitationDto } from '../dto/retriever.dto';
import type { RetrievedChunk } from '../types/retriever.types';

/** Maps retrieved chunks to citation objects for chat and search UIs. */
export class SourceAttributionService {
  buildCitations(chunks: RetrievedChunk[]): SourceCitationDto[] {
    return sourceCitationService.buildFromChunks(chunks);
  }
}

export const sourceAttributionService = new SourceAttributionService();
