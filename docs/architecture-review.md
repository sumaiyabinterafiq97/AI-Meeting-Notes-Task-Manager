# Architecture Review Report

**Product:** AI Meeting Notes & Task Manager  
**Version:** 1.0  
**Review Date:** 2026-06-15  
**Reviewers:** Principal Architect, Staff Backend, Senior Frontend, Database, DevOps, Technical Lead

---

## Executive Summary

The initial documentation package provides a solid foundation for MVP delivery. Requirements, user stories, API design, database schema, and roadmap are largely coherent and implementable. This review identified **23 gaps**, **12 inconsistencies**, and **15 improvement recommendations**. Corrections have been applied to source documents; new architecture artifacts address production-grade concerns.

**Overall readiness:** ✅ Ready for Phase 1 implementation with documented mitigations for identified risks.

---

## Documents Reviewed

| Document | Status | Action Taken |
|----------|--------|--------------|
| requirements.md | Improved | Split FR/NFR; clarified RBAC delete rules |
| functional-requirements.md | **Created** | Extracted + expanded with canonical enums |
| non-functional-requirements.md | **Created** | Measurable NFRs with IDs |
| user-stories.md | Improved | Fixed MTG-04 role; added traceability |
| architecture.md | Superseded | See system-architecture.md (canonical) |
| database-design.md | Improved | See database-architecture.md + erd.md |
| api-design.md | Improved | See api-architecture-review.md |
| development-roadmap.md | Improved | Added security/observability tasks |
| mvp-definition.md | Improved | Aligned status enums |
| project-scope.md | No change | Adequate |

---

## Phase 1: Gap Analysis

### Critical Gaps (P0 — Must address before MVP)

| # | Gap | Impact | Resolution |
|---|-----|--------|------------|
| G1 | No `ai_processing_jobs` table for job tracking, retries, idempotency | Duplicate AI runs, lost jobs on crash | Added to database-architecture.md |
| G2 | Meeting status vs AI processing_status inconsistency | Frontend/backend bugs | Canonical enum table in functional-requirements.md |
| G3 | Access token storage in localStorage mentioned | XSS token theft | Security doc: memory-only access token |
| G4 | No refresh token rotation | Session fixation risk | FR-AUTH-012 updated; security-architecture.md |
| G5 | No CSRF strategy for refresh cookie | CSRF on token refresh | security-architecture.md: SameSite + origin check |
| G6 | Kanban board loads all tasks unbounded | Performance at scale | FR-TASK-013: paginate DONE column |
| G7 | No assignee workspace membership validation | Cross-tenant assignment bug | FR-WS-015 added |
| G8 | Last owner can be removed | Orphan workspace | FR-WS-013 added |
| G9 | No idempotency on action-item → task creation | Duplicate tasks | FR-TASK-012 + unique `action_item_id` |
| G10 | Concurrent transcript upload while PROCESSING | Race conditions | FR-MTG-016: return 409 |

### High Gaps (P1 — Address in MVP or MVP+1)

| # | Gap | Resolution |
|---|-----|------------|
| G11 | No `notification_preferences` table | Added to database-architecture.md |
| G12 | No correlation/request ID | NFR-OBS-005 added |
| G13 | Transcript FTS expression index not immutable | Use generated `search_vector` column |
| G14 | Dashboard aggregates may full-scan | FR-DASH-005: use counters or indexed aggregates |
| G15 | No email verification flow | Deferred v2; documented in project-scope |
| G16 | AI chat "per user" vs "shared thread" ambiguous | Clarified: shared per meeting (MVP+1) |
| G17 | Missing OpenAPI generation in Phase 1 | Added to roadmap Phase 7, spike in Phase 2 |
| G18 | No staging environment in roadmap | Added to development-roadmap.md |
| G19 | In-process queue not production-safe | BullMQ required before launch (Phase 4 exit) |
| G20 | No object storage migration path for transcripts | scalability-design.md |

### Medium Gaps (P2 — Post-MVP)

| # | Gap |
|---|-----|
| G21 | No audit log table requirements (ADMIN-03) |
| G22 | No billing/usage metering tables |
| G23 | No webhook delivery infrastructure |

---

## Phase 2: Inconsistencies Found & Fixed

| # | Issue | Documents Affected | Fix |
|---|-------|-------------------|-----|
| I1 | Meeting status `READY` vs AI `COMPLETED` | requirements, database, architecture, roadmap | Canonical mapping documented |
| I2 | MTG-04: "owner only" vs FR "owner or creator" | user-stories, requirements | Aligned: creator or owner; member deletes own only |
| I3 | Task delete: RBAC matrix vs API (creator or owner) | requirements, api-design | Matrix updated |
| I4 | Auth rate limit: 5 vs 10 req/min | requirements vs api-design | Standardized: 10/min IP, 5 failures/15min per email |
| I5 | Access token in localStorage (architecture) | architecture.md | Changed to in-memory |
| I6 | AI chat per-user vs per-meeting | requirements, database | Shared per meeting |
| I7 | `meetings` ON DELETE RESTRICT vs workspace soft-delete | database-design | Workspace delete cascades soft-delete to meetings |
| I8 | Notifications missing FR IDs | user-stories traceability | FR-NOTIF-* added |
| I9 | Phase 4 exit: `READY` but diagram says status on meeting only | roadmap, architecture | Both entities updated consistently |
| I10 | `PATCH /users/me` vs `GET /auth/me` split | api-design | Documented under `/users/me` namespace |
| I11 | Invitation accept at `/invitations/:token` outside workspace scope | api-design | Valid; auth required; email must match |
| I12 | MVP timeline 12–16 vs 14–18 weeks | requirements vs roadmap | Standardized to 14–18 weeks |

---

## Phase 3: Architectural Weaknesses

### 3.1 Multi-Tenancy

**Weakness:** Relying solely on middleware for workspace scoping.  
**Improvement:** Prisma extension or repository base class that injects `workspaceId` on all queries. Integration tests for cross-tenant access attempts.

### 3.2 AI Processing

**Weakness:** In-process queue loses jobs on deploy/restart.  
**Improvement:** BullMQ + Redis required before production; job persistence in `ai_processing_jobs` table.

### 3.3 Frontend Auth

**Weakness:** Token in localStorage vulnerable to XSS.  
**Improvement:** Access token in memory (React state/ref); refresh via httpOnly cookie only.

### 3.4 Database

**Weakness:** Large transcripts in TEXT column bloat database.  
**Improvement:** MVP acceptable ≤ 5MB; migrate to S3/R2 at 10k+ meetings with `storage_key` column.

### 3.5 API Design

**Weakness:** Dashboard endpoint is a god object.  
**Improvement:** Split into `/dashboard/stats`, `/dashboard/activity` for caching and parallel fetch (MVP+1 optional).

### 3.6 Search

**Weakness:** Runtime `to_tsvector()` on every query.  
**Improvement:** Generated stored column `search_vector` with GIN index.

---

## Phase 4: Security Concerns

| Concern | Severity | Mitigation |
|---------|----------|------------|
| XSS → token theft | High | Memory-only access token; CSP headers |
| CSRF on refresh | Medium | SameSite=Strict cookie; Origin header validation |
| IDOR on workspace resources | High | Membership check + workspaceId on every query |
| OpenAI data exposure | Medium | Minimize PII; DPA; opt-out per workspace (v2) |
| Rate limit bypass | Medium | Per-IP + per-user limits; AI quota per workspace |
| Invitation token brute force | Low | 256-bit tokens; rate limit accept endpoint |
| Password reset enumeration | Low | Generic response always (already specified) |

Full details: [security-architecture.md](./security-architecture.md)

---

## Phase 5: Scalability Concerns

| Area | Current Design | Risk at Scale | Recommendation |
|------|----------------|---------------|----------------|
| Kanban board | Load all tasks | Slow at 500+ tasks | Paginate DONE; virtualize UI |
| AI jobs | Single worker | Backlog under load | Horizontal workers + Redis queue |
| DB connections | Prisma default | Connection exhaustion | Neon pooler; limit 20/instance |
| Transcript storage | PostgreSQL TEXT | DB size, backup time | Object storage migration path |
| Search | ILIKE + FTS | Slow on large corpus | pg_trgm + materialized search_vector |
| Notifications | Poll only | Stale UX | SSE or WebSocket (v2) |

Full details: [scalability-design.md](./scalability-design.md)

---

## Phase 6: Unclear Workflows — Clarified

### Workflow: First-time user

1. Register → auto-login → redirect to `/workspaces`
2. If no workspaces → prompt create workspace (onboarding modal)
3. After create → redirect to dashboard

### Workflow: Invitation for new user

1. Click invite link → register page with email pre-filled (read-only)
2. After register → auto-accept invitation → redirect to workspace dashboard

### Workflow: Transcript re-upload

1. If status = PROCESSING → 409 Conflict
2. If status = READY → confirm dialog "Re-process? Existing AI output will be replaced."
3. Enqueue new job; set status PROCESSING

### Workflow: Accept action items

1. User selects items → POST accept with `actionItemIds`
2. Server validates all IDs belong to meeting and status = PENDING
3. Transaction: create tasks, update action items to ACCEPTED
4. Rollback on any failure; idempotent on `action_item_id` unique constraint

### Workflow: Meeting delete with tasks

1. Soft-delete meeting
2. Set `tasks.meeting_id = NULL` (or keep with deleted flag in join)
3. Tasks remain on Kanban with "Meeting deleted" badge

---

## Phase 7: Improvements Applied

### requirements.md
- Split into functional/non-functional documents
- Clarified meeting delete permissions
- Added architecture cross-references

### functional-requirements.md (new)
- Canonical status enums
- 20+ new requirements (FR-AUTH-018 through FR-ACT-003)
- Idempotency and concurrency rules

### non-functional-requirements.md (new)
- Numbered NFR IDs with measurable targets
- Observability and correlation ID requirements

### user-stories.md
- Fixed MTG-04 role alignment
- Added notification and activity traceability

### development-roadmap.md
- Staging environment in Phase 7
- BullMQ required for Phase 4 production exit
- Security review gate before launch

### mvp-definition.md
- Status enum alignment (DRAFT, PROCESSING, READY, FAILED)
- Added concurrent upload and idempotency to must-haves

### database-design.md
- Reference to database-architecture.md for canonical schema
- Note on `ai_processing_jobs` and `search_vector`

---

## Phase 8: New Artifacts Created

| Document | Purpose |
|----------|---------|
| system-architecture.md | Canonical high-level and component architecture |
| database-architecture.md | Validated schema, performance, indexes |
| erd.md | GitHub-renderable Mermaid ERD |
| api-architecture-review.md | REST standards, versioning, error handling |
| security-architecture.md | Production security controls |
| scalability-design.md | Caching, queues, storage, monitoring |
| project-structure.md | Production folder layouts |
| risk-assessment.md | Technical risk register |

---

## Recommendations for Engineering Kickoff

1. **Adopt monorepo** with `packages/shared-types` for Zod schemas shared FE/BE
2. **Implement auth first** with refresh rotation and memory-only access token
3. **Add `ai_processing_jobs` table** in Phase 3 (not Phase 4) to avoid migration pain
4. **Use BullMQ from Phase 4 day one** in staging; no in-process queue in production
5. **Write cross-tenant integration tests** before any feature ships
6. **Generate OpenAPI** from Zod/route definitions in Phase 2
7. **Security review** at end of Phase 5 before dashboard/launch work

---

## Sign-Off Checklist

| Area | Reviewer Role | Status |
|------|---------------|--------|
| Requirements completeness | Principal PM | ✅ |
| API design | Staff Backend | ✅ with noted improvements |
| Database design | Database Architect | ✅ with job table addition |
| Frontend architecture | Senior Frontend | ✅ |
| Security | Security Architect | ✅ see security-architecture.md |
| DevOps / scale | DevOps Architect | ✅ see scalability-design.md |
| MVP scope | Technical Lead | ✅ |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-15 | Initial architecture review |
