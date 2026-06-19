import { resolveProviderChain } from '../../../src/modules/llm/services/fallback-manager.service';

describe('resolveProviderChain', () => {
  it('uses mock when AI_USE_MOCK is enabled in test env', () => {
    expect(resolveProviderChain('process-meeting')).toEqual(['mock']);
    expect(resolveProviderChain('chat')).toEqual(['mock']);
    expect(resolveProviderChain('embed')).toEqual(['mock']);
  });
});
