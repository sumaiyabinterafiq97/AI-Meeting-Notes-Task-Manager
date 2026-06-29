import type { RetrievedChunk } from '../../retrievers/types/retriever.types';

const RRF_K = 60;
const RECENCY_DAYS_BOOST = 14;
const RECENCY_BOOST = 0.05;
const DECISION_RISK_BOOST = 0.1;

function isDecisionQuery(query: string): boolean {
  return /\b(decide|decision|agreed|conclude|resolved)\b/i.test(query);
}

function isRiskQuery(query: string): boolean {
  return /\b(risk|blocker|concern|issue|threat)\b/i.test(query);
}

function recencyBoost(metadata: Record<string, unknown>): number {
  const meetingDate =
    typeof metadata.meetingDate === 'string' ? Date.parse(metadata.meetingDate) : NaN;
  if (Number.isNaN(meetingDate)) return 0;

  const ageMs = Date.now() - meetingDate;
  const ageDays = ageMs / (86_400_000);
  return ageDays <= RECENCY_DAYS_BOOST ? RECENCY_BOOST : 0;
}

function sourceTypeBoost(sourceType: string, query: string): number {
  if (isDecisionQuery(query) && sourceType === 'decision') {
    return DECISION_RISK_BOOST;
  }
  if (isRiskQuery(query) && sourceType === 'risk') {
    return DECISION_RISK_BOOST;
  }
  return 0;
}

/**
 * Rule-based re-ranker — recency + source-type boosts (FR-RAG-RERANK-001..003).
 * MVP alternative to cross-encoder; < 200ms p95.
 */
export class ScoreBoostReranker {
  rerank(chunks: RetrievedChunk[], query: string, topK: number): RetrievedChunk[] {
    const scored = chunks.map((chunk, index) => {
      const baseScore = chunk.similarity;
      const boost = recencyBoost(chunk.metadata) + sourceTypeBoost(chunk.sourceType, query);
      const rrfPenalty = 1 / (RRF_K + index + 1);
      return {
        chunk,
        score: baseScore + boost + rrfPenalty * 0.01,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).map((entry, index) => ({
      ...entry.chunk,
      similarity: entry.score,
      metadata: { ...entry.chunk.metadata, rerankPosition: index + 1 },
    }));
  }
}

export const scoreBoostReranker = new ScoreBoostReranker();
