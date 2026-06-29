import type { DocumentSourceType, HybridSearchQuery } from '../types/vector.types';

export class RetrievalFilterValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetrievalFilterValidationError';
  }
}

const VALID_SOURCE_TYPES = new Set<DocumentSourceType>([
  'transcript',
  'summary',
  'decision',
  'risk',
  'action_item',
  'knowledge',
]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

/**
 * Validates retrieval filters — workspace boundary, date range, source types.
 * Prevents cross-workspace leakage and invalid filter combinations (FR-RAG-FILT-002).
 */
export class FilterValidatorService {
  validate(query: HybridSearchQuery): void {
    if (!query.workspaceId?.trim()) {
      throw new RetrievalFilterValidationError('workspaceId is required');
    }

    if (query.sourceTypes?.length) {
      for (const type of query.sourceTypes) {
        if (!VALID_SOURCE_TYPES.has(type)) {
          throw new RetrievalFilterValidationError(`Invalid source type: ${type}`);
        }
      }
    }

    if (query.dateFrom && !ISO_DATE.test(query.dateFrom)) {
      throw new RetrievalFilterValidationError('dateFrom must be ISO-8601 date');
    }

    if (query.dateTo && !ISO_DATE.test(query.dateTo)) {
      throw new RetrievalFilterValidationError('dateTo must be ISO-8601 date');
    }

    if (query.dateFrom && query.dateTo) {
      const from = Date.parse(query.dateFrom);
      const to = Date.parse(query.dateTo);
      if (!Number.isNaN(from) && !Number.isNaN(to) && from > to) {
        throw new RetrievalFilterValidationError('dateFrom must be before dateTo');
      }
    }
  }

  /** Enforces meeting scope — meeting chat cannot retrieve other meetings. */
  assertMeetingScope(workspaceId: string, meetingId: string | undefined, scopedMeetingId?: string): void {
    if (scopedMeetingId && meetingId && meetingId !== scopedMeetingId) {
      throw new RetrievalFilterValidationError('Meeting scope mismatch — cross-meeting retrieval blocked');
    }
  }
}

export const filterValidatorService = new FilterValidatorService();
