# In-app Screen / Tab Recorder

Loom-like capture on the meeting detail page. Frontend-only (no extension, no Meet bot).

## Flow

1. User clicks **Start recording**
2. Browser `getDisplayMedia({ video, audio })` — “Share this screen/tab?”
3. Guidance: select the **Google Meet tab** and enable **Share tab audio** (captures other participants)
4. Browser requests **microphone** (`getUserMedia`) — captures **your** voice (Meet tab audio usually excludes the local speaker)
5. Tab audio + mic are mixed via `AudioContext`, then `MediaRecorder` writes WebM (video + mixed audio)
6. Stop → review → **Download** locally and/or **Upload**
7. Upload uses `POST …/meetings/:id/audio` — **stores file only** (`DRAFT` / audio `PENDING`)
8. User clicks **Translate & Transcribe** on the Upload recording section
9. Pipeline: extract audio → Whisper **translate to English** / mock → AI → `READY`

If the microphone is denied, recording can continue with tab-only audio, but a warning explains that **your voice will not be included**.

See [transcription-flow.md](./transcription-flow.md).

## Constraints

- Disabled while `TRANSCRIBING` / `PROCESSING` (preserves 409 behavior)
- Re-upload replaces media only; does not auto-run AI
- Max size: `VIDEO_MAX_BYTES` (default 500MB)
- Consent copy for screen recordings (tab + mic)
- Prefer headphones to reduce echo when mic + speakers are active
- No silent background recording
- Primary target: Chrome desktop; Safari/Firefox may differ for tab-audio + mic mix

## Manual QA

1. Record with Meet tab + Share tab audio + mic allowed → preview includes your voice
2. Record → Upload → still DRAFT / “Uploaded — not processed yet”
3. Translate & Transcribe → amber then blue banners → READY (transcript includes local speaker)
4. Deny mic once → warning shown; tab audio still works if shared
5. Replace recording → confirm → must click Translate & Transcribe again
6. While busy, record/upload/start disabled
