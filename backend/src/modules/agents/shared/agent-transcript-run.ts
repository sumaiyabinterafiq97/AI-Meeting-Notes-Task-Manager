import type { AgentMessage } from '../types/agent.types';
import {
  AGENT_TRUNCATED_TRANSCRIPT_CHARS,
  truncateTranscriptForAgent,
} from './transcript.utils';

export async function runWithTruncatedRetry<TInput extends { transcript: string }, TOutput>(
  sanitized: TInput,
  prepared: TInput,
  message: AgentMessage<TInput, TOutput>,
  runStructured: (
    msg: AgentMessage<TInput, TOutput>,
    input: TInput,
    options?: { truncated?: boolean },
  ) => Promise<AgentMessage<TInput, TOutput>>,
): Promise<AgentMessage<TInput, TOutput>> {
  const result = await runStructured({ ...message, input: prepared }, prepared);

  if (result.status === 'failed' && sanitized.transcript.length > AGENT_TRUNCATED_TRANSCRIPT_CHARS) {
    const truncated = truncateTranscriptForAgent(
      sanitized.transcript,
      AGENT_TRUNCATED_TRANSCRIPT_CHARS,
    );
    const retryInput = { ...prepared, transcript: truncated.transcript };
    const retryResult = await runStructured(
      { ...message, input: retryInput },
      retryInput,
      { truncated: truncated.truncated },
    );

    if (retryResult.status === 'completed') {
      return retryResult;
    }
  }

  return result;
}
