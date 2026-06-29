import { graphExecutorService } from '../executors/graph-executor.service';
import { getWorkflowDefinition } from '../workflows/workflow.types';
import { weeklyReportNodes } from '../nodes';
import { createInitialState } from '../state/reducers';
import type { OrchestratorGraphState } from '../state/graph-state.types';
import type { WeeklyReportInput } from '../../agents/weekly-report/types/weekly-report.types';

export async function runWeeklyReportGraph(
  input: WeeklyReportInput & { correlationId: string; workspaceId: string; jobId?: string },
  options?: { threadId?: string },
): Promise<OrchestratorGraphState> {
  const definition = getWorkflowDefinition('weekly-report');
  const initialState: OrchestratorGraphState = {
    ...createInitialState({
      workflowId: 'weekly-report',
      correlationId: input.correlationId,
      workspaceId: input.workspaceId,
      jobId: input.jobId,
      input: input as unknown as Record<string, unknown>,
    }),
    workflowId: 'weekly-report',
  };

  return graphExecutorService.invoke(definition, weeklyReportNodes, initialState, {
    threadId: options?.threadId ?? input.correlationId,
  });
}
