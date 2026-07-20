import { LocalAudioStorageService } from '../../src/modules/transcription/services/audio-storage.service';
import { AppError } from '../../src/utils/errors';

describe('LocalAudioStorageService validation', () => {
  const storage = new LocalAudioStorageService();

  it('accepts wav uploads under the audio size limit', () => {
    expect(() =>
      storage.validateUpload({
        fieldname: 'audio',
        originalname: 'standup.wav',
        encoding: '7bit',
        mimetype: 'audio/wav',
        size: 1024,
        buffer: Buffer.alloc(1024),
        destination: '',
        filename: '',
        path: '',
        stream: null as never,
      }),
    ).not.toThrow();
  });

  it('accepts mp4 video under the video size limit', () => {
    expect(() =>
      storage.validateUpload({
        fieldname: 'audio',
        originalname: 'screen.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: 2 * 1024 * 1024,
        buffer: Buffer.alloc(100),
        destination: '',
        filename: '',
        path: '',
        stream: null as never,
      }),
    ).not.toThrow();
  });

  it('accepts webm video by extension', () => {
    expect(() =>
      storage.validateUpload({
        fieldname: 'audio',
        originalname: 'meet.webm',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        size: 1024,
        buffer: Buffer.alloc(1024),
        destination: '',
        filename: '',
        path: '',
        stream: null as never,
      }),
    ).not.toThrow();
  });

  it('rejects unsupported extensions', () => {
    expect(() =>
      storage.validateUpload({
        fieldname: 'audio',
        originalname: 'notes.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 100,
        buffer: Buffer.from('hi'),
        destination: '',
        filename: '',
        path: '',
        stream: null as never,
      }),
    ).toThrow(AppError);
  });

  it('rejects audio files over the audio max size', () => {
    const oversized = storage.maxAudioBytes + 1;
    expect(() =>
      storage.validateUpload({
        fieldname: 'audio',
        originalname: 'huge.mp3',
        encoding: '7bit',
        mimetype: 'audio/mpeg',
        size: oversized,
        buffer: Buffer.alloc(0),
        destination: '',
        filename: '',
        path: '',
        stream: null as never,
      }),
    ).toThrow(/Audio file exceeds/);
  });

  it('rejects video files over the video max size', () => {
    const oversized = storage.maxVideoBytes + 1;
    expect(() =>
      storage.validateUpload({
        fieldname: 'audio',
        originalname: 'huge.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        size: oversized,
        buffer: Buffer.alloc(0),
        destination: '',
        filename: '',
        path: '',
        stream: null as never,
      }),
    ).toThrow(/Video file exceeds/);
  });
});
