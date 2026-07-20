import type { UploadedAudioFile } from '../types/transcription.types';

/**
 * Media object storage abstraction (audio + video recordings).
 * Local filesystem for development; S3/R2 adapter can implement the same contract.
 */
export interface IAudioStorage {
  readonly maxAudioBytes: number;
  readonly maxVideoBytes: number;

  /** @deprecated use maxAudioBytes — kept for older callers */
  readonly maxBytes: number;

  validateUpload(file: UploadedAudioFile): void;

  /**
   * Persist upload. Keys MUST be scoped: `{workspaceId}/{meetingId}/{uuid}.ext`
   */
  saveUploadedFile(
    workspaceId: string,
    meetingId: string,
    file: UploadedAudioFile,
  ): Promise<{ storageKey: string; absolutePath: string }>;

  /**
   * Allocate a path for extracted audio under the same meeting scope.
   * Caller writes via extraction provider into absolutePath.
   */
  allocateExtractedAudioPath(
    workspaceId: string,
    meetingId: string,
    extension: '.wav' | '.mp3',
  ): Promise<{ storageKey: string; absolutePath: string }>;

  /**
   * Resolve a local filesystem path for the provider to read.
   * S3/R2 adapters may download to a temp file before returning.
   */
  resolvePath(storageKey: string): Promise<string>;

  deleteFile(storageKey: string): Promise<void>;

  /**
   * Best-effort cleanup of all media files for a meeting (replace-on-upload).
   * Optional — adapters that cannot list objects may omit this.
   */
  clearMeetingMedia?(workspaceId: string, meetingId: string): Promise<void>;
}
