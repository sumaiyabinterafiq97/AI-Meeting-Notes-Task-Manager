import { orchestratorService } from '../../orchestrator/orchestrator.service';
import { env } from '../../../config/env';
import type { MeetingPipelineInput, MeetingPipelineOutput } from './types/pipeline.types';

export class PipelineOrchestratorService {
  async runMonolithic(input: MeetingPipelineInput): Promise<MeetingPipelineOutput> {
    return orchestratorService.runMonolithic(input);
  }

  async runMultiAgent(input: MeetingPipelineInput): Promise<MeetingPipelineOutput> {
    return orchestratorService.runMeetingIntelligence(input);
  }

  async run(input: MeetingPipelineInput): Promise<MeetingPipelineOutput> {
    if (env.AI_PIPELINE_MODE === 'multi-agent') {
      return this.runMultiAgent(input);
    }
    return this.runMonolithic(input);
  }
}

export const pipelineOrchestrator = new PipelineOrchestratorService();
