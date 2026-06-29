export type CitationConfidence = 'high' | 'medium' | 'low';

export interface SourceCitation {
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
  confidence?: CitationConfidence;
}

export interface CitationValidationResult {
  valid: boolean;
  warnings: string[];
  orphanCitationIndices: number[];
  missingCitationForGroundedAnswer: boolean;
}
