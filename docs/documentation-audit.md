# Documentation Audit — MeetingMind AI v0.7.3

**Audit date:** 2026-07-29  
**Source of truth:** Implementation  
**Related:** [feature-inventory.md](./feature-inventory.md)

---

## Summary

| Severity | Count | Theme                                                                                         |
| -------- | ----- | --------------------------------------------------------------------------------------------- |
| Critical | 6     | Docs describe Tasks/Dashboard as primary UX; invent CI/Turbo monorepo; career pitch at v0.4.0 |
| Major    | 12    | Deploy hosts (Vercel/Railway/Neon), chat “deferred”, Insights screenshots                     |
| Minor    | 10    | Version headers, product rename, overlap between requirements docs                            |
| Info     | 4     | Soft-hidden APIs correctly exist; needs UX callouts                                           |

---

## Issues

### Critical

| File                                      | Problem                                                                                               | Current Implementation                                                                            | Recommended Fix                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `docs/project-structure.md`               | Describes `apps/web`, `packages/`, Turborepo, `.github/workflows` deploy YAMLs                        | Layout is `frontend/` + `backend/` with root scripts (`--prefix`); **no** `.github`, **no** turbo | Rewrite to match repo layout                 |
| `docs/system-architecture.md`             | Frontend on Vercel, API on Railway, Neon PG, Upstash Redis; Dashboard/Kanban as first-class UI        | Local Docker Compose; soft-hidden Tasks/Dashboard                                                 | Rewrite architecture for current deploy + UX |
| `docs/demo/portfolio-screenshot-guide.md` | Instructs Insights tab, Dashboard, Tasks, Search screenshots                                          | Meeting detail tabs are Record/Transcript/Chat/Details; soft-hidden routes redirect               | Align guide to Meetings + Settings + Chat    |
| `career/project-summary.md`               | Version **v0.4.0** (2026-06-27); pitches tasks/search/KB as primary product                           | v0.7.2; primary loop is capture → transcript → meeting chat                                       | Update version and elevator pitch            |
| `docs/api-design.md` §5                   | Says “Chat endpoints deferred (MVP+1)”                                                                | Meeting + workspace chat SSE **implemented**                                                      | Fix status callout                           |
| Root narrative drift                      | Some docs still say “AI Meeting Notes & Task Manager” as primary name without Meetings+Settings focus | Product is MeetingMind AI with simplified nav                                                     | Standardize naming + UX banner               |

### Major

| File                                  | Problem                                                               | Current Implementation                          | Recommended Fix                                      |
| ------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| `docs/functional-requirements.md`     | Tasks/Dashboard/Search framed as P0 product without soft-hide         | Backend yes; UI soft-hidden                     | Add UX status banner + mark FR groups Soft-hidden UI |
| `docs/user-stories.md`                | Kanban/Dashboard stories read as shipped primary UX                   | Soft-hidden                                     | Tag Soft-hidden / Backend-only                       |
| `docs/api-design.md` §§6–7            | Tasks/Dashboard documented as product surfaces without soft-hide note | APIs exist; UI redirects                        | Add Soft-hidden UI callouts                          |
| `docs/security-architecture.md`       | References Railway/Vercel secret stores as current                    | Secrets via `.env` / Docker locally             | Mark production hosts as planned                     |
| `docs/non-functional-requirements.md` | Availability targets assume Railway/Render                            | No production deploy in repo                    | Clarify local/dev vs future prod                     |
| `docs/ai-chat-requirements.md`        | Treats workspace chat as equal product surface                        | Meeting chat live; workspace chat soft-hidden   | Distinguish live vs soft-hidden                      |
| `frontend/README.md`                  | Mentions “meeting chat / insights” in primary journey                 | Insights not on meeting detail                  | Remove insights from primary journey                 |
| `docs/project-structure.md`           | Lists `AIOutputPanel`, Kanban as live tree                            | ActionItemReview unwired; tasks redirect        | Document soft-hidden modules explicitly              |
| Missing `docs/database-design.md`     | Phase 7 expects this name                                             | Schema in `database-architecture.md` + `erd.md` | Add `database-design.md` synced to Prisma            |
| Missing inventory/audit/validation    | Required by docs sync initiative                                      | Not present before this audit                   | Create inventory, audit, cleanup, validation         |
| CI documentation                      | Several docs imply GitHub Actions                                     | Husky only                                      | State “no CI workflows yet”                          |
| Grafana mentions                      | Agent/observability diagrams may imply Grafana                        | In-app observability modules only               | Remove Grafana as deployed component                 |

### Minor

| File                                    | Problem                                              | Current Implementation                           | Recommended Fix                                |
| --------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------- |
| Version headers                         | Many docs at 1.0 / outdated dates                    | Product v0.7.2                                   | Bump headers + “synced to implementation” note |
| `docs/vector-db-design.md`              | Compares Neon/Pinecone as if selecting host          | Local `pgvector/pgvector:pg16` in Compose        | Prefer “current: Docker pgvector”              |
| Overlap LLM/RAG/agent requirement pairs | Duplicate narrative                                  | Useful split req vs architecture                 | Keep both; cross-link; avoid contradicting UX  |
| `docs/README.md`                        | Index incomplete for new audit docs                  | —                                                | Add inventory, database-design, validation     |
| Broken conceptual links                 | Docs link to deleted files from CHANGELOG 0.7.2 trim | Files removed                                    | Grep and fix dangling links                    |
| `store/` in README tree                 | Implies client store in use                          | `frontend/src/store/index.ts` unused placeholder | Note unused or omit                            |
| Platform import docs tone               | May read as live Zoom APIs                           | Client transcript or mock only                   | Mark Partial                                   |
| Email “future” in `.env.example`        | Partially wired                                      | Works when key set                               | Document as optional                           |
| `transcribe_original`                   | Documented; UI always translate                      | Backend supports both                            | Note UI default                                |
| Action-item accept UI                   | Documented as review flow                            | API only in current UX                           | Mark Soft-hidden                               |

### Info / already aligned

| File                                                                                    | Notes                                                         |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Root `README.md`                                                                        | Largely aligned with Meetings + Settings (pre-rewrite polish) |
| `docs/mvp-definition.md`, `docs/project-scope.md`, `docs/requirements.md`               | Recently updated for soft-hide                                |
| `docs/transcription-flow.md`, `docs/screen-recorder.md`, `docs/capture-architecture.md` | Match deferred-start + mic mix                                |
| `docs/google-meet-integration.md`                                                       | Matches Calendar/Meet path                                    |
| `backend/README.md`, prompt docs                                                        | Match agent/prompt modules                                    |
| `CHANGELOG.md`                                                                          | Accurate through 0.7.2                                        |

---

## Broken / dangling references (check on sync)

After CHANGELOG 0.7.2 trim (~19 docs deleted), verify no remaining links to:

- `docs/scalability-design.md`
- `docs/development-roadmap.md`
- `docs/architecture-review*.md`
- `docs/vector-db-requirements.md`
- `docs/zoom-meet-teams-integration.md`
- `docs/system-sequence-diagrams.md`

---

## Missing documentation (to create)

| Document                           | Purpose                                |
| ---------------------------------- | -------------------------------------- |
| `docs/feature-inventory.md`        | Feature status inventory               |
| `docs/documentation-audit.md`      | This audit                             |
| `docs/database-design.md`          | Prisma-synced schema/ERD summary       |
| `docs/document-cleanup-report.md`  | Keep / merge / archive recommendations |
| `docs/documentation-validation.md` | Post-sync consistency check            |

---

## Documentation to update (priority)

1. `docs/system-architecture.md` — rewrite
2. `docs/project-structure.md` — rewrite
3. `docs/api-design.md` — status callouts + Google auth + soft-hide
4. `README.md` — regenerate from implementation
5. `docs/demo/portfolio-screenshot-guide.md` — current tabs only
6. `docs/functional-requirements.md` / `docs/user-stories.md` — soft-hide banners
7. `frontend/README.md` — primary journey wording
8. `career/project-summary.md` — version + pitch
9. `docs/README.md` — index new docs
10. Security / NFR deploy claims — mark planned

---

## Screenshots / diagrams

| Asset                                      | Problem                                 | Fix                                                           |
| ------------------------------------------ | --------------------------------------- | ------------------------------------------------------------- |
| Portfolio guide Insights/Dashboard/Tasks   | Routes soft-hidden or tabs missing      | Screenshot Record, Transcript, Chat, Settings                 |
| `docs/demo/meetingmind-agent-pipeline.png` | Likely still valid for backend pipeline | Keep; ensure caption says backend pipeline                    |
| Root `Screenshot 2026-06-29*.png`          | Unlabeled; may be stale UI              | Relabel or move under `docs/demo/`; verify against current UI |
| Mermaid in `system-architecture.md`        | Wrong hosts + modules                   | Replace with current diagram                                  |
| Mermaid in `project-structure.md`          | Wrong tree                              | Replace                                                       |

---

## Validation criteria (post-sync)

- [ ] Every documented “shipped primary UX” feature exists in nav/routes
- [ ] Soft-hidden surfaces labeled consistently
- [ ] No invented CI/Turbo/`apps/` layout
- [ ] API status callouts match routes
- [ ] Prisma models match database docs
- [ ] No links to deleted markdown files
