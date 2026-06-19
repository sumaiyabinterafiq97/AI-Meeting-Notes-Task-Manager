import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '../../../config/env';
import { AppError, ErrorCodes } from '../../../utils/errors';
import {
  ALLOWED_AUDIO_EXTENSIONS,
  ALLOWED_AUDIO_MIME_TYPES,
  type UploadedAudioFile,
} from '../types/transcription.types';

function extensionFromMime(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return '.mp3';
  if (normalized.includes('m4a') || normalized.includes('mp4')) return '.m4a';
  if (normalized.includes('wav')) return '.wav';
  return '';
}

function extensionFromFilename(filename: string): string {
  return path.extname(filename).toLowerCase();
}

export class AudioStorageService {
  private resolvedRoot: string | null = null;

  get maxBytes(): number {
    return env.AUDIO_MAX_BYTES;
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
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Audio file is required');
    }

    if (file.size > this.maxBytes) {
      throw new AppError(
        400,
        ErrorCodes.VALIDATION_ERROR,
        `Audio file exceeds ${Math.floor(this.maxBytes / (1024 * 1024))}MB limit`,
      );
    }

    const mime = file.mimetype.toLowerCase();
    const ext = extensionFromFilename(file.originalname) || extensionFromMime(mime);

    const mimeAllowed = (ALLOWED_AUDIO_MIME_TYPES as readonly string[]).includes(mime);
    const extAllowed = (ALLOWED_AUDIO_EXTENSIONS as readonly string[]).includes(ext);

    if (!mimeAllowed && !extAllowed) {
      throw new AppError(
        400,
        ErrorCodes.VALIDATION_ERROR,
        'Unsupported audio format. Allowed: .mp3, .m4a, .wav',
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
      extensionFromFilename(file.originalname) ||
      extensionFromMime(file.mimetype) ||
      '.bin';
    const filename = `${randomUUID()}${ext}`;
    const absolutePath = path.join(dir, filename);
    const storageKey = path.posix.join(workspaceId, meetingId, filename);

    await fs.writeFile(absolutePath, file.buffer);

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
}

export const audioStorageService = new AudioStorageService();
