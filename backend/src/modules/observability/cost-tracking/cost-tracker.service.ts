import {
  PROVIDER_MODEL_PRICING,
  resolveProviderFromModel,
  type ProviderId,
} from './provider-pricing';

export interface CostEstimateInput {
  model: string;
  promptTokens: number;
  completionTokens: number;
  embeddingTokens?: number;
}

export interface CostEstimateResult {
  estimatedCostUsd: number;
  provider: ProviderId;
  breakdown: {
    inputCostUsd: number;
    outputCostUsd: number;
    embeddingCostUsd: number;
  };
}

/**
 * Provider-agnostic cost estimation using configurable per-model pricing.
 */
export class CostTrackerService {
  estimate(model: string, promptTokens: number, completionTokens: number): number {
    return this.estimateDetailed({ model, promptTokens, completionTokens }).estimatedCostUsd;
  }

  estimateDetailed(input: CostEstimateInput): CostEstimateResult {
    const pricing = PROVIDER_MODEL_PRICING[input.model] ?? { inputPer1M: 0, outputPer1M: 0 };
    const provider = resolveProviderFromModel(input.model);

    const inputCostUsd = (input.promptTokens / 1_000_000) * pricing.inputPer1M;
    const outputCostUsd = (input.completionTokens / 1_000_000) * pricing.outputPer1M;
    const embeddingRate = pricing.embeddingPer1M ?? pricing.inputPer1M;
    const embeddingCostUsd =
      ((input.embeddingTokens ?? 0) / 1_000_000) * embeddingRate;

    return {
      estimatedCostUsd: inputCostUsd + outputCostUsd + embeddingCostUsd,
      provider,
      breakdown: { inputCostUsd, outputCostUsd, embeddingCostUsd },
    };
  }

  registerModelPricing(model: string, inputPer1M: number, outputPer1M: number): void {
    PROVIDER_MODEL_PRICING[model] = { inputPer1M, outputPer1M };
  }
}

export const costTrackerService = new CostTrackerService();
