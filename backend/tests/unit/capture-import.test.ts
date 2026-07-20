import { MeetingImportProvider, MeetingSource } from '@prisma/client';
import { zoomImportProvider } from '../../src/modules/capture/imports/zoom/zoom-import.provider';
import { googleMeetImportProvider } from '../../src/modules/capture/imports/google-meet/google-meet-import.provider';
import { teamsImportProvider } from '../../src/modules/capture/imports/teams/teams-import.provider';
import { mockMeetingImportProvider } from '../../src/modules/capture/imports/mock/mock-import.provider';

describe('Meeting import adapters — normalization', () => {
  const workspaceId = '00000000-0000-4000-8000-000000000001';

  it('mock provider returns a long enough transcript', async () => {
    const payload = await mockMeetingImportProvider.importRecording({ workspaceId });
    expect(payload.transcriptText.length).toBeGreaterThanOrEqual(100);
    expect(payload.importProvider).toBe(MeetingImportProvider.ZOOM);
  });

  it('zoom adapter maps to ZOOM_IMPORT source', async () => {
    const payload = await zoomImportProvider.importRecording({
      workspaceId,
      title: 'Zoom sync',
      transcriptText: 'A'.repeat(120),
    });
    expect(payload.meetingSource).toBe(MeetingSource.ZOOM_IMPORT);
    expect(payload.importProvider).toBe(MeetingImportProvider.ZOOM);
    expect(payload.title).toBe('Zoom sync');
  });

  it('google-meet adapter maps to GOOGLE_MEET_IMPORT', async () => {
    const payload = await googleMeetImportProvider.importRecording({
      workspaceId,
      vttContent: 'WEBVTT\n\n' + 'hello world '.repeat(20),
    });
    expect(payload.meetingSource).toBe(MeetingSource.GOOGLE_MEET_IMPORT);
    expect(payload.sourceFormat).toBe('vtt');
  });

  it('teams adapter maps to TEAMS_IMPORT', async () => {
    const payload = await teamsImportProvider.importRecording({
      workspaceId,
      transcriptText: 'B'.repeat(120),
      externalMeetingId: 'teams-1',
    });
    expect(payload.meetingSource).toBe(MeetingSource.TEAMS_IMPORT);
    expect(payload.externalMeetingId).toBe('teams-1');
  });
});
