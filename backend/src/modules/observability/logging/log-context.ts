import { AsyncLocalStorage } from 'async_hooks';

export interface ObservabilityContext {
  requestId?: string;
  correlationId?: string;
  userId?: string;
  workspaceId?: string;
}

const storage = new AsyncLocalStorage<ObservabilityContext>();

export function runWithObservabilityContext<T>(
  context: ObservabilityContext,
  fn: () => T,
): T {
  return storage.run(context, fn);
}

export function getObservabilityContext(): ObservabilityContext {
  return storage.getStore() ?? {};
}

export function mergeObservabilityContext(
  partial: ObservabilityContext,
): ObservabilityContext {
  return { ...getObservabilityContext(), ...partial };
}
