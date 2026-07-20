# Capture Architecture — MeetingMind AI

**Status:** Phase A shipped · Phase B backend shipped · Phase C adapters scaffolded · Phase D bots stubbed  
**Related:** [transcription-flow.md](./transcription-flow.md) · [meeting-import-strategy.md](./meeting-import-strategy.md) · [zoom-meet-teams-integration.md](./zoom-meet-teams-integration.md)

## Problem

MeetingMind cannot feel like a meeting intelligence platform if users must manually paste transcripts. Capture is the layer that **obtains** transcripts (audio, calendar stubs, platform import, future bots) and hands them to the existing AI pipeline.

## Principle

```
Capture adapters → Meeting + Transcript (+ optional audio)
                         ↓
              existing process-meeting / agents / RAG / chat
```

- Domain services never call Whisper / Zoom / Meet / Teams SDKs directly.
- Provider logic lives in adapters (`ITranscriptionProvider`, `IAudioExtractionProvider`, `IMeetingImportProvider`, `IMeetingBotProvider`).
- Workspace isolation on every path and storage key.

## Module map

| Concern | Location |
|---------|----------|
| Audio/video upload + extract + Whisper/mock | `backend/src/modules/transcription/` |
| Capture façade, imports, bots, malware hook | `backend/src/modules/capture/` |
| Calendar OAuth + sync + reminders | `backend/src/modules/calendar/` |
| AI handoff | `aiJobService.enqueueProcessing` / BullMQ `process-meeting` |

## Status machine

`DRAFT → TRANSCRIBING (audio/video) → PROCESSING → READY | FAILED`

Paste transcript and platform import skip `TRANSCRIBING` and go `DRAFT → PROCESSING`.

## Phase A media

| Input | Path |
|-------|------|
| Audio `.mp3` / `.m4a` / `.wav` | Validate → store → `transcribe-audio` |
| Video `.mp4` / `.webm` | Validate → store → **extract audio** (`IAudioExtractionProvider`) → store WAV → optional discard video → `transcribe-audio` |
| **In-app screen/tab recorder** | Browser `getDisplayMedia` → WebM → same video upload endpoint → extract → transcribe → AI |

See [screen-recorder.md](./screen-recorder.md). Google Meet link creation: [google-meet-integration.md](./google-meet-integration.md).

## Phases

| Phase | Capability | Status |
|-------|------------|--------|
| A | Audio **and video** → transcript → AI | **Shipped** |
| B | Calendar auto-create + transcript reminders | **Backend shipped**; needing-transcript UI |
| C | Zoom / Meet / Teams import adapters | **Scaffold + mock handoff** |
| D | Live meeting bots | **Interfaces + 501 stubs only** |

## Observability

- `transcription.duration`, `transcription.audio.bytes`
- `capture.audio_extract.duration`
- `capture.import.duration`
- Logs never include secrets, raw media, or full transcript bodies
