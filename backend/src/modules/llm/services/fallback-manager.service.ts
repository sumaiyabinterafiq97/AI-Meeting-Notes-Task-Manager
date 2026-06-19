import { env } from '../../../config/env';
import type { LLMProviderId, LLMWorkflow } from '../types/llm.types';
import { providerRegistry } from './provider-registry.service';

function parseFallbackChain(): LLMProviderId[] {
  return env.LLM_FALLBACK_CHAIN.split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value): value is LLMProviderId =>
      ['openai', 'anthropic', 'google', 'local', 'mock'].includes(value),
    );
}

function isProviderConfigured(providerId: LLMProviderId): boolean {
  switch (providerId) {
    case 'mock':
      return true;
    case 'openai':
      return Boolean(env.OPENAI_API_KEY);
    case 'anthropic':
      return Boolean(env.ANTHROPIC_API_KEY);
    case 'google':
      return Boolean(env.GOOGLE_API_KEY);
    case 'local':
      return Boolean(env.LOCAL_LLM_BASE_URL);
    default:
      return false;
  }
}

export function resolveProviderChain(
  workflow: LLMWorkflow,
  override?: LLMProviderId,
): LLMProviderId[] {
  if (env.AI_USE_MOCK) {
    return ['mock'];
  }

  const primary = override ?? env.LLM_PRIMARY_PROVIDER;
  const chain = [primary, ...parseFallbackChain().filter((id) => id !== primary)];

  return chain.filter((providerId) => {
    if (providerId === 'mock') return env.AI_USE_MOCK;
    return isProviderConfigured(providerId);
  });
}

export function getConfiguredProvider(providerId: LLMProviderId) {
  return providerRegistry.getOrThrow(providerId);
}
