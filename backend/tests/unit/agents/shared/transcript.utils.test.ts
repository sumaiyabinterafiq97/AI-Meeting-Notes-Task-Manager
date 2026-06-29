import {
  AGENT_MAX_TRANSCRIPT_CHARS,
  AGENT_TRUNCATED_TRANSCRIPT_CHARS,
  prepareAgentTranscript,
  truncateTranscriptForAgent,
} from '../../../../src/modules/agents/shared/transcript.utils';
import { runWithTruncatedRetry } from '../../../../src/modules/agents/shared/agent-transcript-run';
import type { AgentMessage } from '../../../../src/modules/agents/types/agent.types';

describe('agent transcript utils', () => {
  it('prepareAgentTranscript leaves short transcripts unchanged', () => {
    const input = { transcript: 'Alex: Ship the dashboard.', memberNames: ['Alex'] };
    expect(prepareAgentTranscript(input)).toEqual(input);
  });

  it('truncateTranscriptForAgent preserves head and tail', () => {
    const transcript = `${'A'.repeat(500)}${'B'.repeat(500)}`;
    const result = truncateTranscriptForAgent(transcript, 400);

    expect(result.truncated).toBe(true);
    expect(result.transcript).toContain('[... transcript truncated for processing ...]');
    expect(result.transcript.startsWith('A')).toBe(true);
    expect(result.transcript.endsWith('B')).toBe(true);
  });

  it('exports shared transcript budgets', () => {
    expect(AGENT_MAX_TRANSCRIPT_CHARS).toBeGreaterThan(AGENT_TRUNCATED_TRANSCRIPT_CHARS);
  });
});

describe('runWithTruncatedRetry', () => {
  it('retries with truncated transcript when the first pass fails', async () => {
    const longTranscript = 'x'.repeat(AGENT_TRUNCATED_TRANSCRIPT_CHARS + 1_000);
    const sanitized = { transcript: longTranscript };
    const prepared = prepareAgentTranscript(sanitized);
    const message = {
      id: 'msg-1',
      correlationId: 'corr-1',
      agentType: 'task-extractor' as const,
      workspaceId: 'ws-1',
      input: prepared,
      status: 'pending' as const,
      metrics: { startedAt: new Date().toISOString() },
    };

    const runStructured = jest
      .fn<
        Promise<AgentMessage<typeof sanitized, { actionItems: [] }>>,
        [AgentMessage<typeof sanitized, { actionItems: [] }>, typeof sanitized, { truncated?: boolean } | undefined]
      >()
      .mockResolvedValueOnce({
        ...message,
        status: 'failed',
        error: { code: 'AGENT_EXECUTION_FAILED', message: 'timeout', retryable: true },
        metrics: { startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), latencyMs: 1 },
      })
      .mockResolvedValueOnce({
        ...message,
        status: 'completed',
        output: { actionItems: [] },
        metrics: {
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          latencyMs: 2,
          promptTokens: 10,
          completionTokens: 5,
          model: 'mock',
          provider: 'mock',
        },
      });

    const result = await runWithTruncatedRetry(sanitized, prepared, message, runStructured);

    expect(result.status).toBe('completed');
    expect(runStructured).toHaveBeenCalledTimes(2);
    expect(runStructured.mock.calls[1]?.[2]).toEqual({ truncated: true });
  });
});
