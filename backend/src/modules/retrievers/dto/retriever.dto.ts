import type { RetrievedChunk } from '../types/retriever.types';

export interface SourceCitationDto {
  index: number;
  chunkId: string;
  sourceType?: string;
  meetingId?: string;
  meetingTitle?: string;
  meetingDate?: string;
  excerpt: string;
  similarityScore?: number;
  timestamp?: string;
  claimText?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface RetrievalResponseDto {
  chunks: RetrievedChunk[];
  citations: SourceCitationDto[];
  cacheHit: boolean;
  latencyMs: number;
  retrievalMode: 'hybrid' | 'semantic' | 'keyword' | 'keyword_only';
  avgSimilarity: number;
}
