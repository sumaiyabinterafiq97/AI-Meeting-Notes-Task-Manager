# Requirements

**Product:** AI Meeting Notes & Task Manager  
**Version:** 1.1  
**Status:** Approved for Implementation

> **Note:** Functional and non-functional requirements have been split into dedicated documents for maintainability. See [functional-requirements.md](./functional-requirements.md) and [non-functional-requirements.md](./non-functional-requirements.md).

---

## 1. Product Vision

### Problem Statement

Teams spend significant time in meetings but lose context afterward. Notes are inconsistent, action items are buried in transcripts, ownership is unclear, and follow-through is poor. Existing tools either handle meetings (transcription/summarization) or tasks (Kanban/project management) — rarely both in a unified, workspace-aware workflow.

### Target Users

| Segment | Description |
|---------|-------------|
| Small–mid teams (5–50) | Engineering, product, and operations teams with recurring standups and planning meetings |
| Team leads & PMs | Need accountability, visibility, and decision traceability |
| Individual contributors | Need clarity on what was decided and what they own |
| Org admins | Need workspace governance, billing, and security controls |

### Business Value

- **Time savings:** Reduce post-meeting admin from 15–30 min to under 2 min per meeting
- **Accountability:** Auto-extracted action items with assignees and due dates
- **Institutional memory:** Searchable summaries, decisions, and meeting history
- **Velocity:** Fewer dropped tasks and fewer "what did we decide?" follow-ups

### Core Objectives

1. Ingest meeting transcripts and produce structured AI outputs (summary, decisions, risks, action items)
2. Convert action items into trackable tasks with assignment and status workflow
3. Provide workspace-scoped collaboration with role-based access
4. Deliver a fast, accessible UI with real-time-feeling updates via React Query
5. Ship an MVP in ~14–18 weeks with clear path to production SaaS

### Success Metrics

| Metric | Target (MVP + 90 days) |
|--------|--------------------------|
| Transcript → structured output success rate | ≥ 95% |
| Time to first summary | < 60 seconds (p95) |
| Task creation from AI suggestions acceptance rate | ≥ 70% |
| Weekly active workspaces | Growth baseline TBD |
| Task completion rate (assigned → done) | ≥ 60% within due date |
| User-reported NPS | ≥ 40 |
| API uptime | ≥ 99.5% |
| Support tickets per 100 meetings | < 5 |

---

## 2. User Personas

### Team Member — Alex (Software Engineer)

**Profile:** IC on an 8-person product squad; attends 4–6 meetings/week.

| | |
|--|--|
| **Goals** | Know what was decided and what they own; minimize note-taking; track personal action items |
| **Pain Points** | Forgotten action items; disputed decisions; duplicate data entry across tools |
| **Workflows** | Upload transcript → review AI summary → accept tasks; Kanban board; search past decisions |

### Team Lead — Jordan (Engineering Manager)

**Profile:** Leads 2 squads; runs weekly syncs and retros.

| | |
|--|--|
| **Goals** | Ensure follow-through; surface risks early; maintain alignment without micromanaging |
| **Pain Points** | No single source of truth; chasing status updates; retro items never closed |
| **Workflows** | Create meeting → upload transcript → edit AI output; assign tasks; monitor dashboard |

### Project Manager — Sam (Technical PM)

**Profile:** Cross-functional coordinator; owns roadmap and stakeholder comms.

| | |
|--|--|
| **Goals** | Document decisions with audit trail; track risks; produce status updates quickly |
| **Pain Points** | Manual synthesis of notes; stakeholders need proof; risks lost between meetings |
| **Workflows** | Review AI decisions/risks; search summaries; share meeting output |

### Company Admin — Morgan (IT / Operations Admin)

**Profile:** Manages SaaS tools, users, and security for a 100-person company.

| | |
|--|--|
| **Goals** | Control workspace access; enforce security; clean onboarding/offboarding |
| **Pain Points** | Shadow IT; no membership visibility; AI data privacy concerns |
| **Workflows** | Create org; invite owners; configure roles; review usage and retention |

---

## 3. Requirements Documents

| Document | Contents |
|----------|----------|
| [functional-requirements.md](./functional-requirements.md) | All FR-* requirements by module |
| [non-functional-requirements.md](./non-functional-requirements.md) | Performance, security, scalability, observability |
| [user-stories.md](./user-stories.md) | User stories with acceptance criteria |

---

## 4. Role-Based Access Control

### Roles

| Role | Scope | Description |
|------|-------|-------------|
| Platform Admin | Platform | Super-user for SaaS operator (future) |
| Workspace Owner | Workspace | Full control within workspace |
| Member | Workspace | Collaborate; limited admin actions |

### Permissions Matrix

| Resource / Action | Platform Admin | Owner | Member |
|-------------------|:--------------:|:-----:|:------:|
| Register / login | ✓ | ✓ | ✓ |
| Create workspace | ✓ | ✓ | ✓ |
| Read workspace | ✓ | ✓ | ✓ |
| Update workspace settings | ✓ | ✓ | ✗ |
| Delete workspace | ✓ | ✓ | ✗ |
| Invite / remove members | ✓ | ✓ | ✗ |
| Change member roles | ✓ | ✓ | ✗ |
| Meeting: create / read | ✓ | ✓ | ✓ |
| Meeting: update | ✓ | ✓ | ✓ |
| Meeting: delete (own) | ✓ | ✓ | ✓ |
| Meeting: delete (any) | ✓ | ✓ | ✗ |
| Transcript upload | ✓ | ✓ | ✓ |
| AI trigger / edit | ✓ | ✓ | ✓ |
| AI chat | ✓ | ✓ | ✓ (MVP+1) |
| Task: create / read / update | ✓ | ✓ | ✓ |
| Task: delete (own) | ✓ | ✓ | ✓ |
| Task: delete (any) | ✓ | ✓ | ✗ |
| Comments | ✓ | ✓ | ✓ |
| Dashboard / search | ✓ | ✓ | ✓ |
| Notifications (own) | ✓ | ✓ | ✓ |

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
  "actionItems": [{
    "title": "string",
    "description": "string",
    "suggestedAssignee": "string|null",
    "suggestedDueDate": "YYYY-MM-DD|null"
  }]
}
```

Post-process: fuzzy-match `suggestedAssignee` to workspace member display names.

---

## 6. Architecture References

| Topic | Document |
|-------|----------|
| System design | [system-architecture.md](./system-architecture.md) |
| Security | [security-architecture.md](./security-architecture.md) |
| Database | [database-architecture.md](./database-architecture.md) |
| API review | [api-architecture-review.md](./api-architecture-review.md) |
| Scalability | [scalability-design.md](./scalability-design.md) |
| Risks | [risk-assessment.md](./risk-assessment.md) |
