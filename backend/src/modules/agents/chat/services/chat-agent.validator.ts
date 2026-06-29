import { sourceCitationService } from '../../../rag/citations/services/source-citation.service';
import type { ContextBlock } from '../../../rag/types/rag.types';
import type { ChatAgentCitation, ChatValidationResult } from '../types/chat-agent.types';
import type { ChatResponse } from '../../schemas/zod-schemas';
import {
  CITATION_EXCERPT_LENGTH,
  CLAIM_TEXT_MAX_LENGTH,
  REFUSAL_PATTERNS,
} from './chat-agent.constants';

function toChatAgentCitation(citation: ReturnType<typeof sourceCitationService.parseFromResponse>[number]): ChatAgentCitation {
  return {
    index: citation.index,
    chunkId: citation.chunkId,
    excerpt: citation.excerpt.slice(0, CITATION_EXCERPT_LENGTH),
    meetingId: citation.meetingId,
    meetingTitle: citation.meetingTitle,
    claimText: citation.claimText?.slice(0, CLAIM_TEXT_MAX_LENGTH),
  };
}

export function isRefusalResponse(content: string): boolean {
  return REFUSAL_PATTERNS.some((pattern) => pattern.test(content)) ||
    sourceCitationService.isRefusalResponse(content);
}

export function resolveRefusalReason(content: string, emptyContext: boolean): string | null {
  return sourceCitationService.resolveRefusalReason(content, emptyContext);
}

export function mapChatCitations(content: string, contextBlocks: ContextBlock[]): ChatAgentCitation[] {
  return sourceCitationService
    .parseFromResponse(content, contextBlocks)
    .map(toChatAgentCitation);
}

export function validateChatCitations(
  content: string,
  citations: ChatAgentCitation[],
  contextBlocks: ContextBlock[],
): ChatValidationResult {
  const result = sourceCitationService.validate(
    content,
    citations.map((citation) => ({
      index: citation.index,
      chunkId: citation.chunkId,
      excerpt: citation.excerpt,
      meetingId: citation.meetingId,
      meetingTitle: citation.meetingTitle,
      claimText: citation.claimText,
    })),
    contextBlocks,
    contextBlocks.length === 0,
  );

  return {
    valid: result.valid,
    warnings: result.warnings,
    orphanCitationIndices: result.orphanCitationIndices,
  };
}

export function computeChatGrounded(
  citations: ChatAgentCitation[],
  contextBlocks: ContextBlock[],
  emptyContext: boolean,
  content: string,
): boolean {
  return sourceCitationService.computeGrounded(
    citations.map((citation) => ({
      index: citation.index,
      chunkId: citation.chunkId,
      excerpt: citation.excerpt,
      meetingId: citation.meetingId,
      meetingTitle: citation.meetingTitle,
      claimText: citation.claimText,
    })),
    contextBlocks,
    emptyContext,
    content,
  );
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
  return sourceCitationService
    .mergeStructured(
      (parsed.citations ?? []).map((citation) => ({
        index: citation.index,
        chunkId: citation.chunkId,
        excerpt: citation.excerpt,
        meetingId: citation.meetingId,
        claimText: citation.claimText,
      })),
      contextBlocks,
      parsed.content,
    )
    .map(toChatAgentCitation);
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
