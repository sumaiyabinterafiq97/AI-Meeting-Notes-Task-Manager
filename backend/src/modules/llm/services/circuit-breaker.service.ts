import type { LLMProviderId } from '../types/llm.types';

interface CircuitState {
  failures: number;
  openedAt: number | null;
}

const FAILURE_THRESHOLD = 5;
const OPEN_DURATION_MS = 60_000;

export class CircuitBreakerService {
  private readonly states = new Map<LLMProviderId, CircuitState>();

  private getState(providerId: LLMProviderId): CircuitState {
    const existing = this.states.get(providerId);
    if (existing) return existing;
    const initial: CircuitState = { failures: 0, openedAt: null };
    this.states.set(providerId, initial);
    return initial;
  }

  isOpen(providerId: LLMProviderId): boolean {
    const state = this.getState(providerId);
    if (!state.openedAt) return false;

    if (Date.now() - state.openedAt >= OPEN_DURATION_MS) {
      state.openedAt = null;
      state.failures = 0;
      return false;
    }

    return true;
  }

  recordSuccess(providerId: LLMProviderId): void {
    this.states.set(providerId, { failures: 0, openedAt: null });
  }

  recordFailure(providerId: LLMProviderId): void {
    const state = this.getState(providerId);
    state.failures += 1;
    if (state.failures >= FAILURE_THRESHOLD) {
      state.openedAt = Date.now();
    }
    this.states.set(providerId, state);
  }

  reset(providerId?: LLMProviderId): void {
    if (providerId) {
      this.states.delete(providerId);
      return;
    }
    this.states.clear();
  }
}

export const circuitBreakerService = new CircuitBreakerService();
