import multer from 'multer';
import { env } from '../../../config/env';
import { AppError, ErrorCodes } from '../../../utils/errors';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: env.AUDIO_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'audio/mpeg',
      'audio/mp3',
      'audio/mp4',
      'audio/x-m4a',
      'audio/m4a',
      'audio/wav',
      'audio/x-wav',
      'audio/wave',
    ];
    const ext = file.originalname.toLowerCase();
    const extOk = ext.endsWith('.mp3') || ext.endsWith('.m4a') || ext.endsWith('.wav');
    if (allowed.includes(file.mimetype) || extOk) {
      cb(null, true);
      return;
    }
    cb(new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Unsupported audio format'));
  },
});

export const audioUploadMiddleware = upload.single('audio');
