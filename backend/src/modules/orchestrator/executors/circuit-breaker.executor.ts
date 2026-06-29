export interface CircuitBreakerState {
  failures: number;
  lastFailureAt?: number;
  openUntil?: number;
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetMs: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetMs: 60_000,
};

export class CircuitBreaker {
  private readonly states = new Map<string, CircuitBreakerState>();
  private readonly options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  isOpen(key: string): boolean {
    const state = this.states.get(key);
    if (!state?.openUntil) return false;
    if (Date.now() >= state.openUntil) {
      this.states.delete(key);
      return false;
    }
    return true;
  }

  recordSuccess(key: string): void {
    this.states.delete(key);
  }

  recordFailure(key: string): void {
    const current = this.states.get(key) ?? { failures: 0 };
    const failures = current.failures + 1;
    if (failures >= this.options.failureThreshold) {
      this.states.set(key, {
        failures,
        lastFailureAt: Date.now(),
        openUntil: Date.now() + this.options.resetMs,
      });
    } else {
      this.states.set(key, { failures, lastFailureAt: Date.now() });
    }
  }

  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.isOpen(key)) {
      throw new Error(`Circuit breaker open for ${key}`);
    }
    try {
      const result = await fn();
      this.recordSuccess(key);
      return result;
    } catch (error) {
      this.recordFailure(key);
      throw error;
    }
  }
}

export const nodeCircuitBreaker = new CircuitBreaker();
