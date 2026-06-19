const MODEL_PRICING_USD_PER_1M: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
};

/**
 * Cost tracker — estimates USD cost per LLM invocation.
 */
export class CostTrackerService {
  estimate(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = MODEL_PRICING_USD_PER_1M[model] ?? { input: 0, output: 0 };
    return (
      (promptTokens / 1_000_000) * pricing.input +
      (completionTokens / 1_000_000) * pricing.output
    );
  }
}

export const costTrackerService = new CostTrackerService();
