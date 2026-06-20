import { toolExecutorService, toolRegistryService } from '../../../src/modules/agents/tools';

describe('agent tool executor', () => {
  it('lists all registered search tools', () => {
    const names = toolRegistryService.list().map((tool) => tool.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'SearchMeetingsTool',
        'SearchTasksTool',
        'SearchDecisionsTool',
        'SearchRisksTool',
        'SearchKnowledgeTool',
      ]),
    );
  });

  it('returns error for unknown tool', async () => {
    const result = await toolExecutorService.execute(
      { name: 'UnknownTool', arguments: {} },
      { workspaceId: '00000000-0000-0000-0000-000000000001' },
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown tool');
  });

  it('exposes OpenAI-compatible tool definitions', () => {
    const defs = toolRegistryService.getToolDefinitions();
    expect(defs.length).toBeGreaterThanOrEqual(5);
    expect(defs[0]).toMatchObject({
      type: 'function',
      function: expect.objectContaining({
        name: expect.any(String),
        description: expect.any(String),
        parameters: expect.any(Object),
      }),
    });
  });
});
