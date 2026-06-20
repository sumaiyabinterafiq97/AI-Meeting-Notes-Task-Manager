import type { TaskExtractorInput, TaskExtractorOutput } from '../types/task-extractor.types';

export type TaskExtractorInputDto = TaskExtractorInput;
export type TaskExtractorOutputDto = TaskExtractorOutput;
export type ActionItemDto = TaskExtractorOutput['actionItems'][number];
