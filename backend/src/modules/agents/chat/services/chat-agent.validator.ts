import { citationParserService } from '../../../rag/services/citation-parser.service';
import type { ContextBlock } from '../../../rag/types/rag.types';
import type { ChatAgentCitation, ChatValidationResult } from '../types/chat-agent.types';
import type { ChatResponse } from '../../schemas/zod-schemas';
import {
  CITATION_EXCERPT_LENGTH,
  CLAIM_TEXT_MAX_LENGTH,
  EMPTY_CONTEXT_RESPONSE,
  REFUSAL_PATTERNS,
} from './chat-agent.constants';

function extractClaimText(content: string, index: number): string | undefined {
  const pattern = new RegExp(`[^.!?\\n]*\\[CITATION-${index}\\][^.!?\\n]*[.!?]?`, 'i');
  const match = content.match(pattern);
  return match?.[0]?.trim().slice(0, CLAIM_TEXT_MAX_LENGTH);
}

export function isRefusalResponse(content: string): boolean {
  return REFUSAL_PATTERNS.some((pattern) => pattern.test(content));
}

export function resolveRefusalReason(content: string, emptyContext: boolean): string | null {
  if (emptyContext) {
    return 'empty_context';
  }
  if (isRefusalResponse(content)) {
    return 'insufficient_context';
  }
  return null;
}

export function mapChatCitations(content: string, contextBlocks: ContextBlock[]): ChatAgentCitation[] {
  return citationParserService.mapCitations(content, contextBlocks).map((citation) => ({
    index: citation.index,
    chunkId: citation.chunkId ?? '',
    excerpt: (citation.excerpt ?? '').slice(0, CITATION_EXCERPT_LENGTH),
    meetingId: citation.meetingId,
    meetingTitle: citation.meetingTitle,
    claimText: extractClaimText(content, citation.index),
  }));
}

export function validateChatCitations(
  content: string,
  citations: ChatAgentCitation[],
  contextBlocks: ContextBlock[],
): ChatValidationResult {
  const validIndices = new Set(contextBlocks.map((block) => block.citationIndex));
  const orphanCitationIndices = citations
    .map((citation) => citation.index)
    .filter((index) => contextBlocks.length > 0 && !validIndices.has(index));

  const warnings: string[] = [];
  if (orphanCitationIndices.length > 0) {
    warnings.push('Some citation indices did not match retrieved context blocks.');
  }

  const referenced = citationParserService.extractCitationReferences(content);
  if (referenced.length === 0 && citations.length > 0 && !isRefusalResponse(content)) {
    warnings.push('Answer may be insufficiently cited for the retrieved context.');
  }

  return {
    valid: orphanCitationIndices.length === 0,
    warnings,
    orphanCitationIndices,
  };
}

export function computeChatGrounded(
  citations: ChatAgentCitation[],
  contextBlocks: ContextBlock[],
  emptyContext: boolean,
  content: string,
): boolean {
  if (emptyContext || isRefusalResponse(content) || content === EMPTY_CONTEXT_RESPONSE) {
    return false;
  }
  return citations.length > 0 || contextBlocks.length > 0;
}

export interface EnrichChatOutputParams {
  content: string;
  contextBlocks: ContextBlock[];
  emptyContext: boolean;
  injectionDetected?: boolean;
}

export function mergeStructuredChatCitations(
  parsed: ChatResponse,
  contextBlocks: ContextBlock[],
): ChatAgentCitation[] {
  const blockByIndex = new Map(contextBlocks.map((block) => [block.citationIndex, block]));

  if (parsed.citations?.length) {
    return parsed.citations.map((citation) => {
      const block = blockByIndex.get(citation.index);
      return {
        index: citation.index,
        chunkId: citation.chunkId || block?.chunkId || '',
        excerpt: (citation.excerpt ?? block?.content ?? '').slice(0, CITATION_EXCERPT_LENGTH),
        meetingId: citation.meetingId ?? block?.meetingId,
        meetingTitle: block?.meetingTitle,
        claimText: citation.claimText,
      };
    });
  }

  return mapChatCitations(parsed.content, contextBlocks);
}

export interface EnrichStructuredChatOutputParams {
  parsed: ChatResponse;
  contextBlocks: ContextBlock[];
  emptyContext: boolean;
  injectionDetected?: boolean;
}

export function enrichStructuredChatOutput(params: EnrichStructuredChatOutputParams): {
  content: string;
  citations: ChatAgentCitation[];
  grounded: boolean;
  refusalReason: string | null;
  injectionDetected: boolean;
} {
  const content = params.parsed.content.trim();
  const citations = mergeStructuredChatCitations(params.parsed, params.contextBlocks);
  validateChatCitations(content, citations, params.contextBlocks);

  const grounded =
    params.parsed.grounded ??
    computeChatGrounded(citations, params.contextBlocks, params.emptyContext, content);
  const refusalReason =
    params.parsed.refusalReason ??
    resolveRefusalReason(content, params.emptyContext);

  return {
    content,
    citations,
    grounded,
    refusalReason,
    injectionDetected: params.injectionDetected ?? false,
  };
}

export function enrichChatOutput(params: EnrichChatOutputParams): {
  content: string;
  citations: ChatAgentCitation[];
  grounded: boolean;
  refusalReason: string | null;
  injectionDetected: boolean;
} {
  const citations = mapChatCitations(params.content, params.contextBlocks);
  validateChatCitations(params.content, citations, params.contextBlocks);

  return {
    content: params.content.trim(),
    citations,
    grounded: computeChatGrounded(
      citations,
      params.contextBlocks,
      params.emptyContext,
      params.content,
    ),
    refusalReason: resolveRefusalReason(params.content, params.emptyContext),
    injectionDetected: params.injectionDetected ?? false,
  };
}

export function stripChatCitationsForMerge(citations: ChatAgentCitation[]): ChatAgentCitation[] {
  return citations.map(({ index, chunkId, excerpt, meetingId, meetingTitle }) => ({
    index,
    chunkId,
    excerpt,
    meetingId,
    meetingTitle,
  }));
}
