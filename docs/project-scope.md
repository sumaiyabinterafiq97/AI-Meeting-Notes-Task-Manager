# Project Scope

**Product:** MeetingMind AI  
**Version:** 1.2  
**Last Updated:** 2026-07-21

---

## 1. Project Summary

MeetingMind AI is a B2B SaaS application that helps teams capture meetings (paste transcript **or** record/upload audio/video → **Translate & Transcribe**), produce AI-generated summaries, decisions, action items, and risks, and track follow-up work in workspace-scoped multi-tenant environments.

---

## 2. In Scope

### Product Features

| Area             | Scope                                                                         |
| ---------------- | ----------------------------------------------------------------------------- |
| Authentication   | Email/password, Google Sign-In, JWT, refresh tokens, password reset           |
| Workspaces       | Multi-tenant workspaces with Owner/Member roles, invitations                  |
| Meetings         | CRUD, paste/text transcript, **recording upload**, screen recorder, history   |
| Capture pipeline | Upload stores only; user **Translate & Transcribe** → English transcript → AI |
| AI Processing    | Summary, decisions, risks, action items (mock or live LLM)                    |
| Tasks            | Kanban, assignment, status, comments, meeting linkage                         |
| Calendar / Meet  | Google Calendar sync, create event with Meet link, start reminders            |
| Chat / RAG       | Meeting-scoped chat with citations (product surfaces may vary by nav)         |
| Notifications    | In-app (assignments, mentions, meeting starting soon)                         |
| Search           | Keyword + semantic/hybrid (when enabled)                                      |

### Technical Scope

| Layer       | Technologies                                                          |
| ----------- | --------------------------------------------------------------------- |
| Frontend    | React, TypeScript, Tailwind CSS, Shadcn UI, React Query, React Router |
| Backend     | Node.js, Express, TypeScript, Prisma ORM                              |
| Database    | PostgreSQL + pgvector                                                 |
| AI / speech | Multi-provider LLM; Whisper translations (default English)            |
| Jobs        | BullMQ + Redis (optional with `AI_USE_MOCK`)                          |
| DevOps      | Docker Compose, GitHub Actions                                        |

---

## 3. Out of Scope (current release)

| Item                         | Rationale                              | Target               |
| ---------------------------- | -------------------------------------- | -------------------- |
| Live Zoom/Meet/Teams bots    | Interfaces stubbed; no live attendance | Later                |
| Live platform import APIs    | Scaffold + mock handoff only           | Near-term            |
| SSO / SAML / OIDC            | Enterprise                             | Later                |
| Billing / Stripe             | Post-PMF                               | Later                |
| Mobile native apps           | Responsive web first                   | Later                |
| Silent background recording  | Requires explicit user gesture         | Never (product rule) |
| Auto-start Whisper on upload | User must click Translate & Transcribe | By design            |
| Speaker diarization          | Provider support pending               | Later                |
| Deepgram production path     | Stub                                   | Later                |

---

## 4. Assumptions

1. Users may paste transcripts **or** upload/record media and run Translate & Transcribe
2. Default transcription product path targets **English** output (Bengali+English → English)
3. Teams are 5–50 people per workspace
4. Live Whisper/LLM usage requires API keys and budget; local demo uses `AI_USE_MOCK=true`
5. Users have modern browsers (Chrome/Edge recommended for screen + tab audio)
6. Email delivery for invitations/password reset may be stubbed locally
7. Single-region deployment acceptable initially
8. No HIPAA/SOC2 required for portfolio/MVP demos

---

## 5. Constraints

| Constraint      | Detail                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------- |
| Timeline        | 14–18 weeks to MVP with 2 engineers                                                             |
| Budget          | Minimize infrastructure costs; use free tiers where possible                                    |
| Team size       | 2 full-stack engineers (+ part-time PM/design)                                                  |
| Transcript size | 5 MB / ~100k characters for paste; audio/video limits via `AUDIO_MAX_BYTES` / `VIDEO_MAX_BYTES` |
| AI latency      | Async processing; no synchronous OpenAI/Whisper in request path (except mock inline)            |
| Capture UX      | Upload stores only; Whisper starts on Translate & Transcribe                                    |

---

## 6. Dependencies

### External Services

| Service         | Purpose                     | Required By |
| --------------- | --------------------------- | ----------- |
| Neon PostgreSQL | Primary database            | Phase 1     |
| OpenAI API      | AI processing               | Phase 4     |
| Email provider  | Password reset, invitations | Phase 1–2   |
| Vercel          | Frontend hosting            | Phase 7     |
| Railway/Render  | API hosting                 | Phase 7     |
| Upstash Redis   | Job queue (recommended)     | Phase 4     |
| Sentry          | Error monitoring            | Phase 7     |

### Internal Dependencies

```
Phase 1 (Auth)
  └── Phase 2 (Workspaces)
        └── Phase 3 (Meetings + paste transcript)
              └── Phase 4 (AI)
                    └── Phase 5 (Tasks)
                          └── Phase 6 (Dashboard)
                                └── Phase 7 (Deploy)
                                      └── Phase 8 (Capture + Translate & Transcribe) [shipped]
```

---

## 7. Stakeholders

| Role               | Interest                                  |
| ------------------ | ----------------------------------------- |
| Engineering team   | Clear requirements, feasible architecture |
| Product owner      | MVP delivery, user value                  |
| End users (teams)  | Time savings, accountability, easy UX     |
| Company leadership | Time to market, cost control              |

---

## 8. Success Criteria

### Launch Criteria

- All MVP must-have features implemented and tested
- Production deployment live and stable
- Core user flow works: register → workspace → meeting → AI → tasks → dashboard
- API uptime ≥ 99% during soft launch week
- No P0 security vulnerabilities

### 90-Day Post-Launch

- ≥ 10 active workspaces
- ≥ 95% AI processing success rate
- ≥ 70% action item acceptance rate
- NPS ≥ 40 from early adopters

---

## 9. Risks & Mitigations

| Risk                   | Impact   | Likelihood | Mitigation                                               |
| ---------------------- | -------- | ---------- | -------------------------------------------------------- |
| AI hallucinations      | High     | Medium     | Human review before task creation; editable outputs      |
| OpenAI cost overrun    | Medium   | Medium     | Token limits; chunk long transcripts; monitor usage      |
| Multi-tenant data leak | Critical | Low        | Workspace scoping on every query; integration tests      |
| Scope creep            | High     | High       | Strict MVP boundary; phased roadmap; change control      |
| OpenAI API downtime    | Medium   | Low        | Retry with backoff; graceful error UI; queue persistence |
| Slow AI processing     | Medium   | Medium     | Async jobs; status polling; set user expectations        |
| Low adoption           | High     | Medium     | Focus on core workflow; early user feedback loops        |

---

## 10. Future Enhancements

### Integrations

- Zoom, Google Meet, MS Teams auto-import
- Slack task notifications
- Jira/Linear bidirectional sync

### AI Advanced

- Custom prompt templates per workspace
- Multi-language transcript support
- Speaker diarization
- Meeting comparison ("what changed since last planning?")

### Collaboration

- Live co-editing of summaries
- Meeting templates
- Recurring meeting series

### Enterprise

- SSO (SAML/OIDC)
- SCIM user provisioning
- Data residency options
- BYOK for OpenAI
- Admin analytics dashboard

### Monetization

- Free tier: 5 meetings/month
- Pro: unlimited meetings
- Team: advanced RBAC
- Enterprise: SSO + compliance

### Analytics

- Decision velocity metrics
- Meeting cost calculator
- Team health scores

### Automation

- Rule-based auto-assignment
- Recurring task templates
- Webhook API for external systems

### Compliance

- GDPR data export/delete
- Configurable retention policies
- Audit trail export

---

## 11. Glossary

| Term                   | Definition                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------- |
| Workspace              | Top-level tenant container for a team's meetings and tasks                         |
| Meeting                | A recorded session with metadata and optional transcript                           |
| Translate & Transcribe | User action that runs Whisper (default → English) then AI on an uploaded recording |
| Action Item Suggestion | AI-extracted follow-up item pending user acceptance                                |
| Task                   | Trackable work item on the Kanban board                                            |
| AI Output              | Structured results: summary, decisions, risks                                      |
| MVP                    | Minimum Viable Product — first shippable release                                   |
| MVP+1                  | High-priority features within 1–4 weeks post-launch                                |

---

## 12. Related Documents

- [requirements.md](./requirements.md)
- [user-stories.md](./user-stories.md)
- [system-architecture.md](./system-architecture.md)
- [database-architecture.md](./database-architecture.md)
- [api-design.md](./api-design.md)
- [mvp-definition.md](./mvp-definition.md)
