# Document Cleanup Report — MeetingMind AI

**Date:** 2026-07-29  
**Rule:** Recommend only — **do not delete automatically**

---

## Summary

| Action           | Count                                                          |
| ---------------- | -------------------------------------------------------------- |
| Keep             | 40+                                                            |
| Merge (optional) | 8 clusters                                                     |
| Archive          | 1 set (`career/` older narratives — update in place preferred) |
| Rename           | 0 required                                                     |
| Delete           | 0 mandatory (already trimmed in 0.7.2)                         |

---

## Keep

| Path                                                                                                      | Reason                                          |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Root `README.md`, `CHANGELOG.md`                                                                          | Entry points                                    |
| `docs/feature-inventory.md`                                                                               | Status inventory                                |
| `docs/system-architecture.md`, `project-structure.md`, `api-design.md`                                    | Synced core                                     |
| `docs/database-design.md`, `database-architecture.md`, `erd.md`                                           | Schema (design = summary; architecture = depth) |
| Capture docs (`transcription-flow`, `capture-architecture`, `screen-recorder`, `google-meet-integration`) | Match code                                      |
| LLM/RAG/agent/observability pairs                                                                         | Backend truth                                   |
| `mvp-definition`, `project-scope`, `requirements`                                                         | Product scope                                   |
| `backend/prompts/**`                                                                                      | Runtime prompts                                 |
| `frontend/README.md`, `backend/README.md`                                                                 | Package guides                                  |
| Audit trio (`documentation-audit`, `document-cleanup-report`, `documentation-validation`)                 | Maintainability                                 |

---

## Merge (optional, non-blocking)

| Cluster                                                          | Recommendation                                   |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| `llm-requirements.md` + `llm-architecture.md`                    | Keep split; add “synced” banners if drift recurs |
| `rag-requirements.md` + `rag-architecture.md` + flows            | Keep; architecture wins on disagreement          |
| `multi-agent-requirements` + `agent-architecture` + `agent-flow` | Keep; flow doc is most operational               |
| `observability-requirements` + `observability-design`            | Keep                                             |
| `database-architecture` + `database-design` + `erd`              | Keep three roles (depth / summary / diagram)     |
| Requirements trilogy + MVP + scope                               | Keep; already soft-hide aligned                  |
| `career/*` vs product docs                                       | Keep career separate; sync version/pitch only    |

---

## Archive / update in place

| Path                              | Recommendation                                                   |
| --------------------------------- | ---------------------------------------------------------------- |
| `career/project-summary.md`       | **Update** to v0.7.2 Meetings+Settings pitch (do not archive)    |
| Other `career/*`                  | Keep for interviews; refresh version refs when citing product    |
| Root `Screenshot 2026-06-29*.png` | Move to `docs/demo/` or delete if obsolete; verify vs current UI |

---

## Rename

None required. `database-design.md` added alongside existing architecture doc (intentional dual naming).

---

## Delete (do **not** auto-delete)

Already removed in CHANGELOG 0.7.2 (~19 files). Do **not** restore:

- One-shot architecture reviews, stale roadmaps, duplicate SRS, unused ops essays listed in that changelog

Candidate future deletes (human decision only):

| Candidate                             | Why                                             |
| ------------------------------------- | ----------------------------------------------- |
| Unlabeled root screenshots            | May be stale                                    |
| Unused frontend soft-hidden **pages** | Product decision — currently kept for re-enable |
| `frontend/src/store/index.ts`         | Dead code (code cleanup, not docs)              |

---

## Duplicate / overlapping narrative

Acceptable overlap remains between requirements and architecture docs. After this sync, contradictions on **primary UX** and **repo layout** should be resolved. Re-run [documentation-validation.md](./documentation-validation.md) after large feature changes.

---

## Recommended maintainer workflow

1. Change code
2. Update `feature-inventory.md` status row
3. Update `api-design.md` / Prisma docs if surface area changed
4. Keep README primary loop accurate
5. Avoid inventing CI/cloud hosts until they exist in-repo
