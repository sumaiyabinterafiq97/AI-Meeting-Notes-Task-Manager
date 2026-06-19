import { AppError, ErrorCodes } from '../../../utils/errors';
import type { AgentMessage, AgentType, IAgent } from '../types/agent.types';

export function createAgentStub<TInput, TOutput>(type: AgentType): IAgent<TInput, TOutput> {
  return {
    type,
    async execute(_message: AgentMessage<TInput, TOutput>): Promise<AgentMessage<TInput, TOutput>> {
      throw new AppError(501, ErrorCodes.INTERNAL_ERROR, `${type} agent not yet implemented`);
    },
  };
}
