import { analyzeTranscript } from '../../../lib/openai';
import { env } from '../../../config/env';
import { summarizerAgent, buildSummarizerMessage } from '../summarizer/services/summarizer.service';
import {
  taskExtractorAgent,
  buildTaskExtractorMessage,
} from '../task-extractor/services/task-extractor.service';
import { decisionAgent, buildDecisionMessage } from '../decision/services/decision.service';
import {
  riskAnalyzerAgent,
  buildRiskAnalyzerMessage,
} from '../risk-analyzer/services/risk-analyzer.service';
import { outputMergerService } from './services/output-merger.service';
import type { MeetingPipelineInput, MeetingPipelineOutput } from './types/pipeline.types';

export class PipelineOrchestratorService {
  async runMonolithic(input: MeetingPipelineInput): Promise<MeetingPipelineOutput> {
    const analysis = await analyzeTranscript({
      transcript: input.transcript,
      meetingTitle: input.meetingTitle,
      attendees: input.attendees,
      memberNames: input.memberNames,
      workspaceId: input.workspaceId,
      correlationId: input.correlationId,
    });

    return {
      result: analysis.result,
      modelVersion: analysis.model,
      promptTokens: analysis.promptTokens ?? 0,
      completionTokens: analysis.completionTokens ?? 0,
      rawResponse: { mode: 'monolithic', data: analysis.rawResponse },
      partialFailure: false,
    };
  }

  async runMultiAgent(input: MeetingPipelineInput): Promise<MeetingPipelineOutput> {
    const agentOptions = {
      meetingId: input.meetingId,
      correlationId: input.correlationId,
      jobId: input.jobId,
    };

    const summarizerMessage = buildSummarizerMessage(
      {
        transcript: input.transcript,
        meetingTitle: input.meetingTitle,
        memberNames: input.memberNames,
        meetingDate: input.meetingDate,
        durationMinutes: input.durationMinutes,
      },
      input.workspaceId,
      agentOptions,
    );

    const [summarizerResult, taskResult, decisionResult] = await Promise.all([
      summarizerAgent.execute(summarizerMessage),
      taskExtractorAgent.execute(
        buildTaskExtractorMessage(
          {
            transcript: input.transcript,
            memberNames: input.memberNames,
            meetingDate: input.meetingDate,
          },
          input.workspaceId,
          agentOptions,
        ),
      ),
      decisionAgent.execute(
        buildDecisionMessage(
          {
            transcript: input.transcript,
            memberNames: input.memberNames,
            meetingDate: input.meetingDate,
          },
          input.workspaceId,
          agentOptions,
        ),
      ),
    ]);

    const summaryContext = summarizerResult.output?.summary;
    const decisionContext = decisionResult.output?.decisions;

    const riskResult = await riskAnalyzerAgent.execute(
      buildRiskAnalyzerMessage(
        {
          transcript: input.transcript,
          summary: summaryContext,
          decisions: decisionContext,
          meetingDate: input.meetingDate,
          tags: input.tags,
        },
        input.workspaceId,
        agentOptions,
      ),
    );

    const merged = outputMergerService.merge(
      summarizerResult,
      taskResult,
      decisionResult,
      riskResult,
    );

    return {
      result: {
        summary: merged.summary,
        topics: merged.topics,
        decisions: merged.decisions,
        risks: merged.risks,
        actionItems: merged.actionItems,
      },
      modelVersion: 'multi-agent',
      promptTokens: merged.promptTokens,
      completionTokens: merged.completionTokens,
      rawResponse: {
        mode: 'multi-agent',
        agents: merged.agentDetails,
      },
      partialFailure: merged.partialFailure,
    };
  }

  async run(input: MeetingPipelineInput): Promise<MeetingPipelineOutput> {
    if (env.AI_PIPELINE_MODE === 'multi-agent') {
      return this.runMultiAgent(input);
    }
    return this.runMonolithic(input);
  }
}

export const pipelineOrchestrator = new PipelineOrchestratorService();
