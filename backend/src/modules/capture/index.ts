/**
 * Meeting Capture layer — audio, platform imports, bot contracts.
 * Audio transcription implementation lives in modules/transcription (reused here).
 */
export { createCaptureRoutes } from './capture.routes';
export { captureHandoffService } from './services/capture-handoff.service';
export { malwareScanService } from './storage/malware-scan.service';
export type { IMeetingImportProvider } from './imports/import-provider.interface';
export type { IMeetingBotProvider } from './bots/meeting-bot.interface';
export { zoomBotStub, googleMeetBotStub, teamsBotStub } from './bots/stubs/meeting-bot.stubs';
export type {
  ImportMeetingRequest,
  ImportMeetingResponse,
  NormalizedCapturePayload,
  MeetingNeedingTranscriptDto,
} from './types/capture.types';

/** Re-export transcription façade so capture consumers have one entrypoint. */
export {
  transcriptionOrchestratorService,
  transcriptionService,
  audioStorageService,
  createTranscriptionRoutes,
} from '../transcription';
