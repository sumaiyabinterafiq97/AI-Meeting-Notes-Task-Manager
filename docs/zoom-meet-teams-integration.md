# Zoom / Google Meet / Microsoft Teams Integration

**Status:** Phase C import adapters · Phase D bot stubs  
**Related:** [capture-architecture.md](./capture-architecture.md) · [meeting-import-strategy.md](./meeting-import-strategy.md)

## Current stance

MeetingMind does **not** ship live meeting bots in this release. Capture progresses in order:

1. **Audio upload** (Phase A) — shipped  
2. **Calendar stubs** (Phase B) — shipped backend  
3. **Cloud import adapters** (Phase C) — scaffolded  
4. **Live bots** (Phase D) — design + stubs only  

## Phase C — Import

| Provider | Adapter | Remote API |
|----------|---------|------------|
| Zoom | `ZoomImportProvider` | Not wired — accept VTT/text or mock |
| Google Meet | `GoogleMeetImportProvider` | Not wired — accept VTT/text or mock |
| Teams | `TeamsImportProvider` | Not wired — accept VTT/text or mock |

Code: `backend/src/modules/capture/imports/`

## Phase D — Live bots (scaffold only)

Interface: `IMeetingBotProvider`

```
joinMeeting(url) → sessionId
leaveMeeting(sessionId)
streamAudioChunks(sessionId)
produceTranscript(sessionId)
```

Stubs throw **501** with a clear message. Location: `backend/src/modules/capture/bots/`

### Why bots wait

- Compliance: consent, retention, regional recording laws  
- Secrets: bot tokens must never reach the frontend  
- Reliability: join failures, waiting rooms, encrypted meetings  
- Cost: always-on worker fleet + media egress  

Bots should produce the **same** `NormalizedCapturePayload` / transcript handoff as imports.

## Security

- No provider API keys in frontend  
- Workspace-scoped imports (`MeetingImport.workspaceId`)  
- Malware scan hook on audio uploads (`malwareScanService` noop stub)  
- Consent copy on recording upload UI  

## Roadmap note

See [future-roadmap.md](./future-roadmap.md) Phase 7 (voice) and Phase 8 (calendar). Platform import/bots extend Phase 7/9-adjacent work without replacing calendar or Slack phases.
