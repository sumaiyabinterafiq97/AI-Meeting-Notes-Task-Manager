# Requirements

**Product:** MeetingMind AI  
**Version:** 1.2  
**Status:** Approved for Implementation · **Current UX:** Meetings + Settings (v0.7.2)

> **Note:** Functional and non-functional requirements have been split into dedicated documents for maintainability. See [functional-requirements.md](./functional-requirements.md) and [non-functional-requirements.md](./non-functional-requirements.md).

> **Current product focus:** Capture → Translate & Transcribe → English transcript → meeting chat. Tasks, dashboard, search, and insights remain long-term / backend capabilities; they are soft-hidden in the primary nav.

---

## 1. Product Vision

### Problem Statement

Teams spend significant time in meetings but lose context afterward. Notes are inconsistent, decisions are hard to find later, and mixed-language recordings (e.g. Bengali + English) are painful to reuse. MeetingMind focuses first on reliable capture and an English transcript you can read, download, and ask about in chat — with structured AI and task follow-through available on the backend for later product surfaces.

### Target Users

| Segment                 | Description                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Small–mid teams (5–50)  | Engineering, product, and operations teams with recurring standups and planning meetings |
| Team leads & PMs        | Need accountability, visibility, and decision traceability                               |
| Individual contributors | Need clarity on what was decided and what they own                                       |
| Org admins              | Need workspace governance, billing, and security controls                                |

### Business Value

- **Time savings:** Skip manual note-taking and ad-hoc translation of mixed-language meetings
- **Reusable transcript:** English document you can read, download, and chat against
- **Grounded answers:** Meeting chat with RAG / corpus fallback instead of “what did we decide?” guesswork
- **Path to accountability:** Action items and tasks remain in the platform APIs for when the UI re-surfaces them

### Core Objectives

1. Ingest meeting content (paste transcript **or** recording → Translate & Transcribe) into an English transcript
2. Provide meeting-scoped chat grounded on that transcript
3. Produce structured AI outputs server-side (summary, decisions, risks, action items) for future / soft-hidden surfaces
4. Provide workspace-scoped collaboration with role-based access (Meetings + Settings primary UX)
5. Keep a clear path to production SaaS (capture loop shipped as v0.7.x)

### Success Metrics

| Metric                                                    | Target (MVP + 90 days)             |
| --------------------------------------------------------- | ---------------------------------- |
| Transcript → structured output success rate               | ≥ 95%                              |
| Time to first summary (text paste / mock)                 | < 60 seconds (p95)                 |
| Time to READY after Translate & Transcribe (live Whisper) | Depends on audio length + provider |
| Task creation from AI suggestions acceptance rate         | ≥ 70%                              |
| Weekly active workspaces                                  | Growth baseline TBD                |
| Task completion rate (assigned → done)                    | ≥ 60% within due date              |
| User-reported NPS                                         | ≥ 40                               |
| API uptime                                                | ≥ 99.5%                            |
| Support tickets per 100 meetings                          | < 5                                |

---

## 2. User Personas

### Team Member — Alex (Software Engineer)

**Profile:** IC on an 8-person product squad; attends 4–6 meetings/week.

|                 |                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Goals**       | Know what was decided and what they own; minimize note-taking; track personal action items                                  |
| **Pain Points** | Forgotten action items; disputed decisions; duplicate data entry across tools                                               |
| **Workflows**   | Record/upload or paste → Translate & Transcribe if needed → read transcript → meeting chat (tasks/search soft-hidden today) |

### Team Lead — Jordan (Engineering Manager)

**Profile:** Leads 2 squads; runs weekly syncs and retros.

|                 |                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Goals**       | Ensure follow-through; surface risks early; maintain alignment without micromanaging                                   |
| **Pain Points** | No single source of truth; chasing status updates; retro items never closed                                            |
| **Workflows**   | Create meeting (Meet link) → capture recording or paste → Translate & Transcribe → review transcript; use meeting chat |

### Project Manager — Sam (Technical PM)

**Profile:** Cross-functional coordinator; owns roadmap and stakeholder comms.

|                 |                                                                                  |
| --------------- | -------------------------------------------------------------------------------- |
| **Goals**       | Document decisions with audit trail; track risks; produce status updates quickly |
| **Pain Points** | Manual synthesis of notes; stakeholders need proof; risks lost between meetings  |
| **Workflows**   | Review AI decisions/risks; search summaries; share meeting output                |

### Company Admin — Morgan (IT / Operations Admin)

**Profile:** Manages SaaS tools, users, and security for a 100-person company.

|                 |                                                                          |
| --------------- | ------------------------------------------------------------------------ |
| **Goals**       | Control workspace access; enforce security; clean onboarding/offboarding |
| **Pain Points** | Shadow IT; no membership visibility; AI data privacy concerns            |
| **Workflows**   | Create org; invite owners; configure roles; review usage and retention   |

---

## 3. Requirements Documents

| Document                                                           | Contents                                          |
| ------------------------------------------------------------------ | ------------------------------------------------- |
| [functional-requirements.md](./functional-requirements.md)         | All FR-\* requirements by module                  |
| [non-functional-requirements.md](./non-functional-requirements.md) | Performance, security, scalability, observability |
| [user-stories.md](./user-stories.md)                               | User stories with acceptance criteria             |

---

## 4. Role-Based Access Control

### Roles

| Role            | Scope     | Description                           |
| --------------- | --------- | ------------------------------------- |
| Platform Admin  | Platform  | Super-user for SaaS operator (future) |
| Workspace Owner | Workspace | Full control within workspace         |
| Member          | Workspace | Collaborate; limited admin actions    |

### Permissions Matrix

| Resource / Action             | Platform Admin | Owner | Member |
| ----------------------------- | :------------: | :---: | :----: |
| Register / login              |       ✓        |   ✓   |   ✓    |
| Create workspace              |       ✓        |   ✓   |   ✓    |
| Read workspace                |       ✓        |   ✓   |   ✓    |
| Update workspace settings     |       ✓        |   ✓   |   ✗    |
| Delete workspace              |       ✓        |   ✓   |   ✗    |
| Invite / remove members       |       ✓        |   ✓   |   ✗    |
| Change member roles           |       ✓        |   ✓   |   ✗    |
| Meeting: create / read        |       ✓        |   ✓   |   ✓    |
| Meeting: update               |       ✓        |   ✓   |   ✓    |
| Meeting: delete (own)         |       ✓        |   ✓   |   ✓    |
| Meeting: delete (any)         |       ✓        |   ✓   |   ✗    |
| Transcript / recording upload |       ✓        |   ✓   |   ✓    |
| Translate & Transcribe        |       ✓        |   ✓   |   ✓    |
| AI trigger / edit             |       ✓        |   ✓   |   ✓    |
| AI chat                       |       ✓        |   ✓   |   ✓    |
| Task: create / read / update  |       ✓        |   ✓   |   ✓    |
| Task: delete (own)            |       ✓        |   ✓   |   ✓    |
| Task: delete (any)            |       ✓        |   ✓   |   ✗    |
| Comments                      |       ✓        |   ✓   |   ✓    |
| Dashboard / search            |       ✓        |   ✓   |   ✓    |
| Notifications (own)           |       ✓        |   ✓   |   ✓    |

### Enforcement

- Middleware: `authenticate` → `requireWorkspaceMember` → `requireRole(['OWNER'])`
- Service-layer authorization on every mutation (defense in depth)
- All tenant queries include `workspace_id` with membership verification

---

## 5. AI Prompt Strategy

Structured JSON output from OpenAI using `response_format: { type: "json_schema" }`:

```json
{
  "summary": "string",
  "topics": ["string"],
  "decisions": [{ "text": "string", "context": "string" }],
  "risks": [{ "text": "string", "severity": "low|medium|high" }],
  "actionItems": [
    {
      "title": "string",
      "description": "string",
      "suggestedAssignee": "string|null",
      "suggestedDueDate": "YYYY-MM-DD|null"
    }
  ]
}
```

Post-process: fuzzy-match `suggestedAssignee` to workspace member display names.

---

## 6. Architecture References

| Topic         | Document                                               |
| ------------- | ------------------------------------------------------ |
| System design | [system-architecture.md](./system-architecture.md)     |
| Security      | [security-architecture.md](./security-architecture.md) |
| Database      | [database-architecture.md](./database-architecture.md) |
| API           | [api-design.md](./api-design.md)                       |
