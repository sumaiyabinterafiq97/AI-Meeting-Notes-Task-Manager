import type { ContextBlock } from '../../types/rag.types';
import type { RetrievedChunk } from '../../../retrievers/types/retriever.types';
import { citationParserService } from '../../services/citation-parser.service';
import type {
  CitationConfidence,
  CitationValidationResult,
  SourceCitation,
} from '../types/citation.types';
import {
  CITATION_EXCERPT_MAX_LENGTH,
  CITATION_REFERENCE_PATTERN,
  NO_RELEVANT_MEETINGS_MESSAGE,
} from '../lib/citation.constants';

function confidenceFromSimilarity(similarity?: number): CitationConfidence | undefined {
  if (similarity === undefined) return undefined;
  if (similarity >= 0.85) return 'high';
  if (similarity >= 0.7) return 'medium';
  return 'low';
}

function extractClaimText(content: string, index: number): string | undefined {
  const pattern = new RegExp(`[^.!?\\n]*\\[CITATION-${index}\\][^.!?\\n]*[.!?]?`, 'i');
  const match = content.match(pattern);
  return match?.[0]?.trim().slice(0, 240);
}

function blockToCitation(
  block: ContextBlock,
  chunk?: RetrievedChunk,
  content?: string,
): SourceCitation {
  return {
    index: block.citationIndex,
    chunkId: block.chunkId ?? '',
    sourceType: chunk?.sourceType ?? (block.metadata.sourceType as string | undefined),
    meetingId: block.meetingId,
    meetingTitle: block.meetingTitle,
    meetingDate:
      typeof block.metadata.meetingDate === 'string' ? block.metadata.meetingDate : undefined,
    excerpt: block.content.slice(0, CITATION_EXCERPT_MAX_LENGTH),
    similarityScore: chunk?.similarity,
    timestamp:
      typeof block.metadata.timestamp_start === 'string'
        ? block.metadata.timestamp_start
        : undefined,
    claimText: content ? extractClaimText(content, block.citationIndex) : undefined,
    confidence: confidenceFromSimilarity(chunk?.similarity),
  };
}

/**
 * Unified source citation service — build, parse, validate per FR-RAG-CITE-*.
 * @see docs/rag-requirements.md §8
 */
export class SourceCitationService {
  buildFromBlocks(blocks: ContextBlock[], chunks?: RetrievedChunk[]): SourceCitation[] {
    const chunkById = new Map(chunks?.map((chunk) => [chunk.id, chunk]) ?? []);
    return blocks.map((block) =>
      blockToCitation(block, block.chunkId ? chunkById.get(block.chunkId) : undefined),
    );
  }

  buildFromChunks(chunks: RetrievedChunk[]): SourceCitation[] {
    return chunks.map((chunk, index) => ({
      index: index + 1,
      chunkId: chunk.id,
      sourceType: chunk.sourceType,
      meetingId: chunk.meetingId,
      meetingTitle:
        typeof chunk.metadata.meetingTitle === 'string' ? chunk.metadata.meetingTitle : undefined,
      meetingDate:
        typeof chunk.metadata.meetingDate === 'string' ? chunk.metadata.meetingDate : undefined,
      excerpt: chunk.content.slice(0, CITATION_EXCERPT_MAX_LENGTH),
      similarityScore: chunk.similarity,
      timestamp:
        typeof chunk.metadata.timestamp_start === 'string'
          ? chunk.metadata.timestamp_start
          : undefined,
      confidence: confidenceFromSimilarity(chunk.similarity),
    }));
  }

  parseFromResponse(content: string, blocks: ContextBlock[], chunks?: RetrievedChunk[]): SourceCitation[] {
    const chunkById = new Map(chunks?.map((chunk) => [chunk.id, chunk]) ?? []);
    const parsed = citationParserService.mapCitations(content, blocks);

    return parsed.map((citation) => {
      const block = blocks.find((entry) => entry.citationIndex === citation.index);
      const chunk = block?.chunkId ? chunkById.get(block.chunkId) : undefined;
      return {
        index: citation.index,
        chunkId: citation.chunkId ?? block?.chunkId ?? '',
        sourceType: chunk?.sourceType ?? (block?.metadata.sourceType as string | undefined),
        meetingId: citation.meetingId ?? block?.meetingId,
        meetingTitle: citation.meetingTitle ?? block?.meetingTitle,
        meetingDate:
          typeof block?.metadata.meetingDate === 'string' ? block.metadata.meetingDate : undefined,
        excerpt: (citation.excerpt ?? block?.content ?? '').slice(0, CITATION_EXCERPT_MAX_LENGTH),
        similarityScore: chunk?.similarity,
        timestamp: citation.timestamp,
        claimText: extractClaimText(content, citation.index),
        confidence: confidenceFromSimilarity(chunk?.similarity),
      };
    });
  }

  mergeStructured(
    structured: Array<Partial<SourceCitation> & { index: number; content?: string }>,
    blocks: ContextBlock[],
    responseContent: string,
    chunks?: RetrievedChunk[],
  ): SourceCitation[] {
    if (structured.length === 0) {
      return this.parseFromResponse(responseContent, blocks, chunks);
    }

    const blockByIndex = new Map(blocks.map((block) => [block.citationIndex, block]));
    const chunkById = new Map(chunks?.map((chunk) => [chunk.id, chunk]) ?? []);

    return structured.map((citation) => {
      const block = blockByIndex.get(citation.index);
      const chunk = citation.chunkId
        ? chunkById.get(citation.chunkId)
        : block?.chunkId
          ? chunkById.get(block.chunkId)
          : undefined;

      return {
        index: citation.index,
        chunkId: citation.chunkId || block?.chunkId || '',
        sourceType: citation.sourceType ?? chunk?.sourceType,
        meetingId: citation.meetingId ?? block?.meetingId,
        meetingTitle: citation.meetingTitle ?? block?.meetingTitle,
        meetingDate:
          citation.meetingDate ??
          (typeof block?.metadata.meetingDate === 'string' ? block.metadata.meetingDate : undefined),
        excerpt: (citation.excerpt ?? block?.content ?? '').slice(0, CITATION_EXCERPT_MAX_LENGTH),
        similarityScore: citation.similarityScore ?? chunk?.similarity,
        timestamp: citation.timestamp,
        claimText: citation.claimText ?? extractClaimText(responseContent, citation.index),
        confidence: confidenceFromSimilarity(citation.similarityScore ?? chunk?.similarity),
      };
    });
  }

  validate(
    content: string,
    citations: SourceCitation[],
    blocks: ContextBlock[],
    emptyContext: boolean,
  ): CitationValidationResult {
    const validIndices = new Set(blocks.map((block) => block.citationIndex));
    const orphanCitationIndices = citations
      .map((citation) => citation.index)
      .filter((index) => blocks.length > 0 && !validIndices.has(index));

    const warnings: string[] = [];
    if (orphanCitationIndices.length > 0) {
      warnings.push('Some citation indices did not match retrieved context blocks.');
    }

    const referenced = [...content.matchAll(CITATION_REFERENCE_PATTERN)].map((match) =>
      Number(match[1]),
    );
    const missingCitationForGroundedAnswer =
      !emptyContext &&
      blocks.length > 0 &&
      citations.length === 0 &&
      referenced.length === 0 &&
      !this.isRefusalResponse(content);

    if (missingCitationForGroundedAnswer) {
      warnings.push('Answer may be insufficiently cited for the retrieved context.');
    }

    if (emptyContext && !this.isRefusalResponse(content) && content !== NO_RELEVANT_MEETINGS_MESSAGE) {
      warnings.push('Response should state no relevant meetings were found when context is empty.');
    }

    return {
      valid: orphanCitationIndices.length === 0 && !missingCitationForGroundedAnswer,
      warnings,
      orphanCitationIndices,
      missingCitationForGroundedAnswer,
    };
  }

  isRefusalResponse(content: string): boolean {
    return (
      content.includes(NO_RELEVANT_MEETINGS_MESSAGE) ||
      /don't have (enough )?information/i.test(content) ||
      /no relevant meetings/i.test(content)
    );
  }

  resolveRefusalReason(content: string, emptyContext: boolean): string | null {
    if (emptyContext) return 'empty_context';
    if (this.isRefusalResponse(content)) return 'insufficient_context';
    return null;
  }

  computeGrounded(
    citations: SourceCitation[],
    blocks: ContextBlock[],
    emptyContext: boolean,
    content: string,
  ): boolean {
    if (emptyContext || this.isRefusalResponse(content) || content === NO_RELEVANT_MEETINGS_MESSAGE) {
      return false;
    }
    return citations.length > 0 || blocks.length > 0;
  }
}

export const sourceCitationService = new SourceCitationService();
