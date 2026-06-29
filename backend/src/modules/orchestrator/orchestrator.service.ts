import { env } from '../../config/env';
import { analyzeTranscript } from '../../lib/openai';
import type {
  MeetingPipelineInput,
  MeetingPipelineOutput,
} from '../agents/orchestrator/types/pipeline.types';
import { checkpointService } from './checkpoints/checkpoint-store';
import { executionMemoryStore } from './memory/orchestrator-memory.adapter';
import { orchestratorEventBus } from './events/event-bus.service';
import type { WeeklyReportInput } from '../agents/weekly-report/types/weekly-report.types';
import type { ChatAgentInput } from '../agents/chat/types/chat-agent.types';
import { runMeetingIntelligenceGraph } from './graphs/meeting-intelligence.graph';
import { runWeeklyReportGraph } from './graphs/weekly-report.graph';
import { runChatGraph } from './graphs/chat.graph';
import { runKnowledgeUpdateGraph } from './graphs/knowledge-update.graph';

export class OrchestratorService {
  async runMeetingIntelligence(input: MeetingPipelineInput): Promise<MeetingPipelineOutput> {
    if (env.AI_PIPELINE_MODE === 'monolithic') {
      return this.runMonolithic(input);
    }

    const finalState = await runMeetingIntelligenceGraph(input, {
      threadId: input.correlationId,
    });

    executionMemoryStore.set(input.correlationId, finalState);
    await checkpointService.checkpoint(input.correlationId, finalState);

    if (!finalState.pipelineOutput) {
      throw new Error('Meeting intelligence pipeline produced no output');
    }

    const output = finalState.pipelineOutput;

    await orchestratorEventBus.emit(
      orchestratorEventBus.createEvent(
        output.partialFailure ? 'GraphPartialSuccess' : 'MeetingProcessed',
        {
          workflowId: 'meeting-intelligence',
          correlationId: input.correlationId,
          workspaceId: input.workspaceId,
          meetingId: input.meetingId,
          payload: {
            partialFailure: output.partialFailure,
            actionItemCount: output.result.actionItems.length,
            decisionCount: output.result.decisions.length,
            riskCount: output.result.risks.length,
          },
        },
      ),
    );

    if (output.result.actionItems.length > 0) {
      await orchestratorEventBus.emit(
        orchestratorEventBus.createEvent('TaskCreated', {
          workflowId: 'meeting-intelligence',
          correlationId: input.correlationId,
          workspaceId: input.workspaceId,
          meetingId: input.meetingId,
          payload: { count: output.result.actionItems.length },
        }),
      );
    }

    if (output.result.decisions.length > 0) {
      await orchestratorEventBus.emit(
        orchestratorEventBus.createEvent('DecisionDetected', {
          workflowId: 'meeting-intelligence',
          correlationId: input.correlationId,
          workspaceId: input.workspaceId,
          meetingId: input.meetingId,
          payload: { count: output.result.decisions.length },
        }),
      );
    }

    if (output.result.risks.length > 0) {
      await orchestratorEventBus.emit(
        orchestratorEventBus.createEvent('RiskDetected', {
          workflowId: 'meeting-intelligence',
          correlationId: input.correlationId,
          workspaceId: input.workspaceId,
          meetingId: input.meetingId,
          payload: { count: output.result.risks.length },
        }),
      );
    }

    if (finalState.status === 'failed') {
      throw new Error('Meeting intelligence pipeline failed — summarizer did not complete');
    }

    return output;
  }

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

  async runWeeklyReport(
    input: WeeklyReportInput & { correlationId: string; workspaceId: string; jobId?: string },
  ) {
    return runWeeklyReportGraph(input);
  }

  async runChat(
    input: ChatAgentInput & {
      correlationId: string;
      workspaceId: string;
      sessionId: string;
      query: string;
    },
  ) {
    return runChatGraph(input);
  }

  async runKnowledgeUpdate(input: {
    correlationId: string;
    workspaceId: string;
    meetingId: string;
    jobId?: string;
    transcript?: string;
    summary?: string;
    decisions?: Array<{ text: string; context: string }>;
    meetingTitle?: string;
    meetingDate?: string;
  }) {
    return runKnowledgeUpdateGraph(input);
  }

  async recoverMeetingIntelligence(
    correlationId: string,
    input: MeetingPipelineInput,
  ): Promise<MeetingPipelineOutput | null> {
    const recovered = await checkpointService.recover(correlationId);
    if (recovered?.pipelineOutput) {
      return recovered.pipelineOutput;
    }
    return this.runMeetingIntelligence(input);
  }
}

export const orchestratorService = new OrchestratorService();
