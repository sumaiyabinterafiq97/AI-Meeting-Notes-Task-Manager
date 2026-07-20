import { api } from '../setup';
import { connectTestDatabase, disconnectTestDatabase, cleanDatabase } from '../helpers/db';
import { setupWorkspaceWithAuth, createMeeting } from '../helpers/meeting-helper';
import { MOCK_TRANSCRIPTION_TEXT } from '../../src/modules/transcription';
import { prisma } from '../../src/config/database';

const dbAvailable = process.env.DATABASE_URL !== undefined;

/** Minimal valid WAV header + silence (mock provider ignores content). */
function minimalWavBuffer(): Buffer {
  const buffer = Buffer.alloc(44);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24);
  buffer.writeUInt32LE(8000, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(0, 40);
  return buffer;
}

(dbAvailable ? describe : describe.skip)('Audio Transcription Integration', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('uploads audio and completes mock transcription + AI pipeline', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    expect(created.status).toBe(201);
    const meetingId = created.body.id as string;

    const upload = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/audio`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('audio', minimalWavBuffer(), 'standup.wav');

    expect(upload.status).toBe(202);
    expect(upload.body.meetingStatus).toBe('READY');
    expect(upload.body.audioId).toBeDefined();

    const status = await api
      .get(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/transcription`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(status.status).toBe(200);
    expect(status.body.audio.status).toBe('COMPLETED');
    expect(status.body.meetingStatus).toBe('READY');
    expect(status.body.transcript.sourceFormat).toBe('audio');
    expect(status.body.transcript.charCount).toBe(MOCK_TRANSCRIPTION_TEXT.length);
  });

  it('rejects unsupported audio format', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    expect(created.status).toBe(201);
    const meetingId = created.body.id as string;

    const response = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/audio`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('audio', Buffer.from('not audio'), 'notes.txt');

    expect(response.status).toBe(400);
  });

  it('uploads mp4 video, extracts audio (mock), and completes AI pipeline', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    const upload = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/audio`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('audio', Buffer.from('fake-mp4-bytes'), {
        filename: 'zoom-recording.mp4',
        contentType: 'video/mp4',
      });

    expect(upload.status).toBe(202);
    expect(upload.body.meetingStatus).toBe('READY');

    const status = await api
      .get(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/transcription`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(status.status).toBe(200);
    expect(status.body.audio.status).toBe('COMPLETED');
    expect(status.body.transcript.sourceFormat).toBe('video');
    expect(status.body.audio.originalName).toBe('zoom-recording.mp4');
  });

  it('uploads webm video and reaches READY via mock extraction', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    const upload = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/audio`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('audio', Buffer.from('fake-webm-bytes'), {
        filename: 'screen-capture.webm',
        contentType: 'video/webm',
      });

    expect(upload.status).toBe(202);
    expect(upload.body.meetingStatus).toBe('READY');
  });

  it('replaces an existing recording on re-upload and reaches READY', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    const first = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/audio`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('audio', minimalWavBuffer(), 'standup.wav');
    expect(first.status).toBe(202);
    const firstAudioId = first.body.audioId as string;

    const second = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/audio`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('audio', minimalWavBuffer(), 'again.wav');

    expect(second.status).toBe(202);
    expect(second.body.meetingStatus).toBe('READY');
    expect(second.body.audioId).toBeDefined();
    expect(second.body.audioId).not.toBe(firstAudioId);

    const status = await api
      .get(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/transcription`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(status.status).toBe(200);
    expect(status.body.audio.status).toBe('COMPLETED');
    expect(status.body.audio.originalName).toBe('again.wav');
    expect(status.body.meetingStatus).toBe('READY');

    const audioCount = await prisma.meetingAudio.count({ where: { meetingId } });
    expect(audioCount).toBe(1);
  });

  it('returns 409 when uploading while meeting is processing', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'PROCESSING' },
    });

    const upload = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/audio`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('audio', minimalWavBuffer(), 'standup.wav');

    expect(upload.status).toBe(409);
    expect(upload.body.error.message).toMatch(/processing/i);
  });

  it('returns 409 when uploading while meeting is transcribing', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'TRANSCRIBING' },
    });

    const upload = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/audio`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('audio', minimalWavBuffer(), 'standup.wav');

    expect(upload.status).toBe(409);
    expect(upload.body.error.message).toMatch(/transcribing/i);
  });

  it('retries a failed transcription and reaches READY', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    const upload = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/audio`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('audio', minimalWavBuffer(), 'standup.wav');
    expect(upload.status).toBe(202);

    const audioId = upload.body.audioId as string;

    await prisma.meetingAudio.update({
      where: { id: audioId },
      data: { status: 'FAILED', errorMessage: 'Simulated provider failure' },
    });
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'FAILED' },
    });

    const retry = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/transcription/retry`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(retry.status).toBe(202);
    expect(retry.body.meetingStatus).toBe('READY');

    const status = await api
      .get(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/transcription`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(status.body.audio.status).toBe('COMPLETED');
    expect(status.body.meetingStatus).toBe('READY');
  });

  it('rejects retry when transcription did not fail', async () => {
    const { accessToken, workspaceId } = await setupWorkspaceWithAuth();
    const created = await createMeeting(accessToken, workspaceId);
    const meetingId = created.body.id as string;

    await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/audio`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('audio', minimalWavBuffer(), 'standup.wav');

    const retry = await api
      .post(`/api/v1/workspaces/${workspaceId}/meetings/${meetingId}/transcription/retry`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(retry.status).toBe(409);
  });
});
