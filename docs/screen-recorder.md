# In-app Screen / Tab Recorder

Loom-like capture on the meeting detail page. Frontend-only (no extension, no Meet bot).

## Flow

1. User clicks **Start recording**
2. Browser `getDisplayMedia({ video, audio })` — “Share this screen/tab?”
3. Guidance: select the **Google Meet tab** and enable **Share tab audio**
4. `MediaRecorder` writes WebM chunks
5. Stop → review → **Download** locally and/or **Upload**
6. Upload uses `POST …/meetings/:id/audio` — **stores file only** (`DRAFT` / audio `PENDING`)
7. User clicks **Translate & Transcribe** on the Upload recording section
8. Pipeline: extract audio → Whisper **translate to English** / mock → AI → `READY`

See [transcription-flow.md](./transcription-flow.md).

## Constraints

- Disabled while `TRANSCRIBING` / `PROCESSING` (preserves 409 behavior)
- Re-upload replaces media only; does not auto-run AI
- Max size: `VIDEO_MAX_BYTES` (default 500MB)
- Consent copy for screen recordings
- No silent background recording

## Manual QA

1. Record → Upload → still DRAFT / “Uploaded — not processed yet”
2. Translate & Transcribe → amber then blue banners → READY
3. Replace recording → confirm → must click Translate & Transcribe again
4. While busy, record/upload/start disabled
