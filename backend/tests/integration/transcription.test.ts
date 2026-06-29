import { api } from '../setup';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  cleanDatabase,
} from '../helpers/db';
import {
  setupWorkspaceWithAuth,
  createMeeting,
} from '../helpers/meeting-helper';
import { MOCK_TRANSCRIPTION_TEXT } from '../../src/modules/transcription';

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
});
