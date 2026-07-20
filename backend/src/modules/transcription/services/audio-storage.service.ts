import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '../../../config/env';
import { AppError, ErrorCodes } from '../../../utils/errors';
import type { IAudioStorage } from '../storage/audio-storage.interface';
import { isAudioUpload, isVideoUpload, type UploadedAudioFile } from '../types/transcription.types';

function extensionFromMime(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (normalized === 'video/mp4') return '.mp4';
  if (normalized === 'video/webm') return '.webm';
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return '.mp3';
  if (normalized.includes('m4a') || normalized === 'audio/mp4') return '.m4a';
  if (normalized.includes('wav')) return '.wav';
  return '';
}

function extensionFromFilename(filename: string): string {
  return path.extname(filename).toLowerCase();
}

/**
 * Local filesystem media storage (dev / single-node).
 * Replace with S3/R2 adapter implementing IAudioStorage for production object storage.
 */
export class LocalAudioStorageService implements IAudioStorage {
  private resolvedRoot: string | null = null;

  get maxAudioBytes(): number {
    return env.AUDIO_MAX_BYTES;
  }

  get maxVideoBytes(): number {
    return env.VIDEO_MAX_BYTES;
  }

  get maxBytes(): number {
    return this.maxAudioBytes;
  }

  async ensureRoot(): Promise<string> {
    if (this.resolvedRoot) {
      return this.resolvedRoot;
    }
    const root = path.resolve(env.AUDIO_STORAGE_PATH);
    await fs.mkdir(root, { recursive: true });
    this.resolvedRoot = root;
    return root;
  }

  validateUpload(file: UploadedAudioFile): void {
    if (!file) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Recording file is required');
    }

    const video = isVideoUpload(file);
    const audio = isAudioUpload(file);

    if (!video && !audio) {
      throw new AppError(
        400,
        ErrorCodes.VALIDATION_ERROR,
        'Unsupported recording format. Allowed: .mp3, .m4a, .wav, .mp4, .webm',
      );
    }

    const limit = video ? this.maxVideoBytes : this.maxAudioBytes;
    if (file.size > limit) {
      const label = video ? 'Video' : 'Audio';
      throw new AppError(
        400,
        ErrorCodes.VALIDATION_ERROR,
        `${label} file exceeds ${Math.floor(limit / (1024 * 1024))}MB limit`,
      );
    }
  }

  async saveUploadedFile(
    workspaceId: string,
    meetingId: string,
    file: UploadedAudioFile,
  ): Promise<{ storageKey: string; absolutePath: string }> {
    this.validateUpload(file);

    const root = await this.ensureRoot();
    const dir = path.join(root, workspaceId, meetingId);
    await fs.mkdir(dir, { recursive: true });

    const ext =
      extensionFromFilename(file.originalname) || extensionFromMime(file.mimetype) || '.bin';
    const filename = `${randomUUID()}${ext}`;
    const absolutePath = path.join(dir, filename);
    const storageKey = path.posix.join(workspaceId, meetingId, filename);

    await fs.writeFile(absolutePath, file.buffer);

    return { storageKey, absolutePath };
  }

  async allocateExtractedAudioPath(
    workspaceId: string,
    meetingId: string,
    extension: '.wav' | '.mp3',
  ): Promise<{ storageKey: string; absolutePath: string }> {
    const root = await this.ensureRoot();
    const dir = path.join(root, workspaceId, meetingId);
    await fs.mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}${extension}`;
    const absolutePath = path.join(dir, filename);
    const storageKey = path.posix.join(workspaceId, meetingId, filename);
    return { storageKey, absolutePath };
  }

  async resolvePath(storageKey: string): Promise<string> {
    const root = await this.ensureRoot();
    const normalized = path.normalize(storageKey).replace(/^(\.\.(\/|\\|$))+/, '');
    const absolutePath = path.join(root, normalized);
    if (!absolutePath.startsWith(root)) {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid storage key');
    }
    return absolutePath;
  }

  async deleteFile(storageKey: string): Promise<void> {
    try {
      const absolutePath = await this.resolvePath(storageKey);
      await fs.unlink(absolutePath);
    } catch {
      // Best-effort cleanup
    }
  }

  async clearMeetingMedia(workspaceId: string, meetingId: string): Promise<void> {
    try {
      const root = await this.ensureRoot();
      const dir = path.join(root, workspaceId, meetingId);
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  }
}

/** Default storage adapter — swap for S3/R2 in production. */
export const audioStorageService: IAudioStorage = new LocalAudioStorageService();
