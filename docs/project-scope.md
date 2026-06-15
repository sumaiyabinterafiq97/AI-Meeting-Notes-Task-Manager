# Project Scope

**Product:** AI Meeting Notes & Task Manager  
**Version:** 1.0  
**Last Updated:** 2026-06-15

---

## 1. Project Summary

AI Meeting Notes & Task Manager is a B2B SaaS application that helps teams automatically convert meeting transcripts into AI-generated summaries, decisions, action items, and risks — then track follow-up work through a collaborative Kanban task management system within workspace-scoped multi-tenant environments.

---

## 2. In Scope

### Product Features

| Area | Scope |
|------|-------|
| Authentication | Email/password, JWT, refresh tokens, password reset |
| Workspaces | Multi-tenant workspaces with Owner/Member roles, invitations |
| Meetings | CRUD, transcript upload/paste, history, filters |
| AI Processing | Summary, decisions, risks, action items via OpenAI |
| Tasks | Kanban board, assignment, status, comments, meeting linkage |
| Notifications | In-app notifications for assignments and mentions |
| Dashboard | Key stats, activity feed |
| Search | Meetings and tasks by title; FTS on summaries (MVP+) |
| Admin | Workspace-level member management (MVP) |

### Technical Scope

| Layer | Technologies |
|-------|--------------|
| Frontend | React, TypeScript, Tailwind CSS, Shadcn UI, React Query, React Router |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL (Neon) |
| AI | OpenAI API (GPT-4o or equivalent) |
| DevOps | Docker, Docker Compose, GitHub Actions |
| Deployment | Vercel (FE), Railway/Render (BE), Neon (DB) |

### Documentation Deliverables (This Phase)

- Requirements specification
- User stories with acceptance criteria
- System architecture
- Database design
- API design
- Development roadmap
- MVP definition
- Project scope (this document)

---

## 3. Out of Scope (MVP)

The following are explicitly **not** included in the initial release:

| Item | Rationale | Target |
|------|-----------|--------|
| Native meeting transcription | Requires audio pipeline; users paste/upload transcripts | v2 |
| Zoom/Teams/Google Meet integrations | Complex OAuth + webhooks | v2 |
| Calendar sync | Third-party API dependencies | v2 |
| SSO / SAML / OIDC | Enterprise feature | v2 |
| Billing / Stripe subscriptions | Post-PMF monetization | v2 |
| Organization-level admin | Workspace-level sufficient for MVP | v2 |
| Mobile native apps | Responsive web first | v2+ |
| Real-time collaboration (WebSockets) | Polling sufficient for MVP | v2 |
| Custom Kanban columns | Fixed 3-column board for MVP | v2 |
| Vector/semantic search | PostgreSQL FTS sufficient initially | v2 |
| Export to PDF/Notion/Slack | Integration work | v2 |
| Audit logs | Compliance feature | v2 |
| AI chat assistant | High value but not blocking MVP | MVP+1 |
| Email notifications | In-app sufficient for MVP | MVP+1 |
| Speaker diarization | Requires audio processing | v2+ |
| Multi-language transcripts | English-first MVP | v2 |

---

## 4. Assumptions

1. Users provide their own meeting transcripts (copy/paste or file upload)
2. Primary language is English for MVP
3. Teams are 5–50 people per workspace
4. OpenAI API is available and within budget (~$0.01–0.10 per meeting)
5. Users have modern browsers (Chrome, Firefox, Safari, Edge — last 2 versions)
6. Email delivery available for password reset and invitations (SendGrid, Resend, or similar)
7. Single-region deployment (US) acceptable for MVP
8. No HIPAA/SOC2 compliance required for initial launch

---

## 5. Constraints

| Constraint | Detail |
|------------|--------|
| Timeline | 14–18 weeks to MVP with 2 engineers |
| Budget | Minimize infrastructure costs; use free tiers where possible |
| Team size | 2 full-stack engineers (+ part-time PM/design) |
| Transcript size | 5 MB / ~100k characters max for MVP |
| AI latency | Async processing; no synchronous OpenAI calls in request path |
| Data residency | Single region (Neon US) for MVP |

---

## 6. Dependencies

### External Services

| Service | Purpose | Required By |
|---------|---------|-------------|
| Neon PostgreSQL | Primary database | Phase 1 |
| OpenAI API | AI processing | Phase 4 |
| Email provider | Password reset, invitations | Phase 1–2 |
| Vercel | Frontend hosting | Phase 7 |
| Railway/Render | API hosting | Phase 7 |
| Upstash Redis | Job queue (recommended) | Phase 4 |
| Sentry | Error monitoring | Phase 7 |

### Internal Dependencies

```
Phase 1 (Auth)
  └── Phase 2 (Workspaces)
        └── Phase 3 (Meetings)
              └── Phase 4 (AI)
                    └── Phase 5 (Tasks)
                          └── Phase 6 (Dashboard)
                                └── Phase 7 (Deploy)
```

---

## 7. Stakeholders

| Role | Interest |
|------|----------|
| Engineering team | Clear requirements, feasible architecture |
| Product owner | MVP delivery, user value |
| End users (teams) | Time savings, accountability, easy UX |
| Company leadership | Time to market, cost control |

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

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| AI hallucinations | High | Medium | Human review before task creation; editable outputs |
| OpenAI cost overrun | Medium | Medium | Token limits; chunk long transcripts; monitor usage |
| Multi-tenant data leak | Critical | Low | Workspace scoping on every query; integration tests |
| Scope creep | High | High | Strict MVP boundary; phased roadmap; change control |
| OpenAI API downtime | Medium | Low | Retry with backoff; graceful error UI; queue persistence |
| Slow AI processing | Medium | Medium | Async jobs; status polling; set user expectations |
| Low adoption | High | Medium | Focus on core workflow; early user feedback loops |

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

| Term | Definition |
|------|------------|
| Workspace | Top-level tenant container for a team's meetings and tasks |
| Meeting | A recorded session with metadata and optional transcript |
| Action Item Suggestion | AI-extracted follow-up item pending user acceptance |
| Task | Trackable work item on the Kanban board |
| AI Output | Structured results: summary, decisions, risks |
| MVP | Minimum Viable Product — first shippable release |
| MVP+1 | High-priority features within 1–4 weeks post-launch |

---

## 12. Related Documents

- [requirements.md](./requirements.md)
- [user-stories.md](./user-stories.md)
- [architecture.md](./architecture.md)
- [database-design.md](./database-design.md)
- [api-design.md](./api-design.md)
- [development-roadmap.md](./development-roadmap.md)
- [mvp-definition.md](./mvp-definition.md)
