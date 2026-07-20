# Meeting Import Strategy — Phase C

**Status:** Adapters scaffolded (client-supplied transcript / mock)  
**Related:** [capture-architecture.md](./capture-architecture.md) · [zoom-meet-teams-integration.md](./zoom-meet-teams-integration.md)

## Goal

Normalize Zoom, Google Meet, and Microsoft Teams **cloud recordings / VTT / notes** into:

`Meeting` + `MeetingTranscript` + `MeetingImport` → existing AI pipeline

Before building live bots (Phase D).

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/api/v1/workspaces/:workspaceId/meetings/imports/zoom` |
| `POST` | `/api/v1/workspaces/:workspaceId/meetings/imports/google-meet` |
| `POST` | `/api/v1/workspaces/:workspaceId/meetings/imports/teams` |

Body (any of):

```json
{
  "title": "Sprint planning",
  "meetingDate": "2026-07-19T15:00:00.000Z",
  "transcriptText": "...",
  "vttContent": "WEBVTT\n...",
  "externalMeetingId": "zoom-uuid",
  "externalRecordingId": "rec-uuid"
}
```

With `AI_USE_MOCK=true`, missing transcript fields are filled with a mock fixture and AI runs inline.

Without mock and without transcript content, providers return **501** until remote OAuth/API fetch is wired.

## Data

- `Meeting.source`: `ZOOM_IMPORT` | `GOOGLE_MEET_IMPORT` | `TEAMS_IMPORT`
- `meeting_imports` row: provider, external IDs, metadata JSON

## Adapter contract

`IMeetingImportProvider.importRecording(...) → NormalizedCapturePayload`

`CaptureHandoffService` persists meeting + transcript and enqueues `process-meeting`.

## Why import before bots

| Import (Phase C) | Live bots (Phase D) |
|------------------|---------------------|
| Uses existing recordings/VTT | Requires join permissions, compliance, always-on infra |
| Lower legal risk | Recording consent + bot policies per org |
| Ships value immediately | Multi-quarter engineering |

## Next increments

1. OAuth apps for Zoom / Google / Microsoft Graph
2. `listRecordings` + download transcript/audio server-side
3. Optional: download audio → existing `transcribe-audio` job
4. UI import wizard on meeting detail
