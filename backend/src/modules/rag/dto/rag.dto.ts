import type { RAGPipelineExecutionResult, RAGPipelineStageMetric } from '../types/rag.types';

export interface RAGPipelineExecuteDto {
  result: RAGPipelineExecutionResult;
  totalLatencyMs: number;
}

export interface RAGPipelineStageSummaryDto {
  stages: RAGPipelineStageMetric[];
  degraded: boolean;
  retries: number;
}
