/** Max transcript chars before truncation for extraction agent LLM calls. */
export const AGENT_MAX_TRANSCRIPT_CHARS = 120_000;

/** Truncated retry budget when the first extraction agent pass fails. */
export const AGENT_TRUNCATED_TRANSCRIPT_CHARS = 40_000;

export function truncateTranscriptForAgent(
  transcript: string,
  maxChars: number,
): { transcript: string; truncated: boolean } {
  if (transcript.length <= maxChars) {
    return { transcript, truncated: false };
  }

  const headSize = Math.floor(maxChars * 0.7);
  const tailSize = Math.floor(maxChars * 0.25);
  const head = transcript.slice(0, headSize);
  const tail = transcript.slice(-tailSize);

  return {
    transcript: `${head}\n\n[... transcript truncated for processing ...]\n\n${tail}`,
    truncated: true,
  };
}

export function prepareAgentTranscript<T extends { transcript: string }>(input: T): T {
  const { transcript } = truncateTranscriptForAgent(input.transcript, AGENT_MAX_TRANSCRIPT_CHARS);
  return transcript === input.transcript ? input : { ...input, transcript };
}
