import multer from 'multer';
import { env } from '../../../config/env';
import { AppError, ErrorCodes } from '../../../utils/errors';
import { ALLOWED_AUDIO_MIME_TYPES, ALLOWED_VIDEO_MIME_TYPES } from '../types/transcription.types';

const storage = multer.memoryStorage();

const maxUploadBytes = Math.max(env.AUDIO_MAX_BYTES, env.VIDEO_MAX_BYTES);

const upload = multer({
  storage,
  limits: { fileSize: maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype.toLowerCase();
    const name = file.originalname.toLowerCase();
    const mimeOk =
      (ALLOWED_AUDIO_MIME_TYPES as readonly string[]).includes(mime) ||
      (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(mime);
    const extOk =
      name.endsWith('.mp3') ||
      name.endsWith('.m4a') ||
      name.endsWith('.wav') ||
      name.endsWith('.mp4') ||
      name.endsWith('.webm');

    if (mimeOk || extOk) {
      cb(null, true);
      return;
    }
    cb(
      new AppError(
        400,
        ErrorCodes.VALIDATION_ERROR,
        'Unsupported recording format. Allowed: .mp3, .m4a, .wav, .mp4, .webm',
      ),
    );
  },
});

/** Field name remains `audio` for API compatibility; accepts audio + video. */
export const audioUploadMiddleware = upload.single('audio');
