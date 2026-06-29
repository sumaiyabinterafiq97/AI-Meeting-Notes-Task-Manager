import type { SourceCitation, CitationValidationResult } from '../types/citation.types';

export type SourceCitationDto = SourceCitation;

export interface ParsedChatCitationsDto {
  citations: SourceCitationDto[];
  validation: CitationValidationResult;
  grounded: boolean;
  refusalReason: string | null;
}
