import { executeNode } from '../executors/node-executor';
import { weeklyReportAgent } from '../../agents/weekly-report/services/weekly-report.service';
import { createAgentMessage } from '../../agents/services/agent-runner.service';
import type { WeeklyReportInput } from '../../agents/weekly-report/types/weekly-report.types';
import type { GraphNodeFn, PartialGraphStateUpdate } from './node.types';
import { orchestratorEventBus } from '../events/event-bus.service';

export const reportNode: GraphNodeFn = async (state) => {
  return executeNode({
    nodeId: 'report',
    agentType: 'weekly-report',
    state,
    fn: async (): Promise<PartialGraphStateUpdate> => {
      const input = state.input as unknown as WeeklyReportInput;
      const message = createAgentMessage('weekly-report', state.workspaceId, input, {
        correlationId: state.correlationId,
        jobId: state.jobId,
      });
      const result = await weeklyReportAgent.execute(message);

      await orchestratorEventBus.emit(
        orchestratorEventBus.createEvent('WeeklyReportGenerated', {
          workflowId: 'weekly-report',
          correlationId: state.correlationId,
          workspaceId: state.workspaceId,
          payload: {
            title: (result.output as { title?: string } | undefined)?.title,
          },
        }),
      );

      return {
        agentResults: { 'weekly-report': result },
        status: 'completed',
        metrics: {
          completedAt: new Date().toISOString(),
          promptTokens: result.metrics.promptTokens ?? 0,
          completionTokens: result.metrics.completionTokens ?? 0,
        },
      };
    },
  });
};

export const weeklyReportPersistNode: GraphNodeFn = async (state) => {
  return { status: state.status === 'failed' ? 'failed' : 'completed' };
};
