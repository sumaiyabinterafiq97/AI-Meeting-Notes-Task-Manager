import { createAgentMessage, runStructuredAgent } from '../../services/agent-runner.service';
import { RISK_ANALYZER_OUTPUT_SCHEMA } from '../../schemas/agent-schemas';
import type { IAgent, AgentMessage } from '../../types/agent.types';
import type { RiskAnalyzerInput, RiskAnalyzerOutput } from '../types/risk-analyzer.types';

const FALLBACK_OUTPUT: RiskAnalyzerOutput = { risks: [] };

export class RiskAnalyzerAgentService implements IAgent<RiskAnalyzerInput, RiskAnalyzerOutput> {
  readonly type = 'risk-analyzer' as const;

  async execute(
    message: AgentMessage<RiskAnalyzerInput, RiskAnalyzerOutput>,
  ): Promise<AgentMessage<RiskAnalyzerInput, RiskAnalyzerOutput>> {
    const { input } = message;

    const decisionsText =
      input.decisions && input.decisions.length > 0
        ? input.decisions.map((d) => `- ${d.text} (${d.context})`).join('\n')
        : '';

    return runStructuredAgent({
      agentType: this.type,
      promptId: 'risk-analyzer',
      workflow: 'risk-analyzer',
      jsonSchema: RISK_ANALYZER_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      message,
      variables: {
        transcript: input.transcript,
        summary: input.summary ?? '',
        decisions: decisionsText,
      },
      userContent: [
        input.summary ? `Meeting summary:\n${input.summary}` : '',
        decisionsText ? `Decisions:\n${decisionsText}` : '',
        '',
        'Transcript:',
        input.transcript,
      ]
        .filter(Boolean)
        .join('\n'),
      fallbackOutput: FALLBACK_OUTPUT,
    });
  }
}

export const riskAnalyzerAgent = new RiskAnalyzerAgentService();

export function buildRiskAnalyzerMessage(
  input: RiskAnalyzerInput,
  workspaceId: string,
  options: { meetingId: string; correlationId: string },
) {
  return createAgentMessage('risk-analyzer', workspaceId, input, options);
}
