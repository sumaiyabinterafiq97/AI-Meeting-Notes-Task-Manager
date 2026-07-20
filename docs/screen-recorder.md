# In-app Screen / Tab Recorder

Loom-like capture on the meeting detail page. Frontend-only (no extension, no Meet bot).

## Flow

1. User clicks **Start recording**
2. Browser `getDisplayMedia({ video, audio })` — “Share this screen/tab?”
3. Guidance: select the **Google Meet tab** and enable **Share tab audio**
4. `MediaRecorder` writes WebM chunks
5. Stop → review duration/size → **Upload** / **Replace recording** or Discard
6. Upload uses existing `POST …/meetings/:id/audio` (video path)
7. If a recording already exists, upload **replaces** it (confirm dialog) and regenerates AI notes
8. Pipeline: extract audio → Whisper/mock → AI → `READY`

## Constraints

- Disabled while `TRANSCRIBING` / `PROCESSING` (preserves 409 behavior)
- Re-upload while READY/DRAFT/FAILED **replaces** the previous recording (not 409)
- Max size: `VIDEO_MAX_BYTES` (default 500MB)
- Permission denied / missing audio track: clear UX, do not fail silently for permission
- Consent copy: recordings may include sensitive on-screen content
- No silent background recording; requires user gesture

## Telemetry

`POST …/meetings/:id/recorder-events` with `{ event: started|stopped|upload_success }`

Metrics: `recorder.started`, `recorder.stopped`, `recorder.upload_success`

## Manual QA

1. Meeting detail → Start recording → share a tab with audio
2. Stop → preview → Upload → status becomes TRANSCRIBING then READY
3. Record again → **Replace recording** → confirm → new READY insights
4. Cancel/discard does not upload
5. While TRANSCRIBING, Start recording and Upload are disabled
6. Existing file Upload / Replace with recording + paste transcript still work
