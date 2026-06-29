import type { ContextBlock } from '../../types/rag.types';

export interface ContextCitationDto {
  index: number;
  chunkId?: string;
  meetingId?: string;
  meetingTitle?: string;
  sourceType?: string;
  excerpt: string;
  similarityScore?: number;
}

export interface ContextBuildResultDto {
  blocks: ContextBlock[];
  formattedContext: string;
  citations: ContextCitationDto[];
  totalTokens: number;
  tokenBudget: number;
  chunksIncluded: number;
  chunksDropped: number;
  useCase?: string;
}
