# Project Structure — MeetingMind AI

**Product:** MeetingMind AI  
**Version:** 0.7.2  
**Synced:** 2026-07-29 (implementation)  
**Pattern:** Two-package monorepo (`frontend/` + `backend/`) with root npm scripts — **not** Turborepo / npm workspaces / `apps/` layout

---

## 1. Repository layout

```
meetingmind-ai/
├── frontend/                 # React 19 + Vite SPA
├── backend/                  # Express 5 + Prisma API
├── docs/                     # Architecture & product docs
├── career/                   # Portfolio / interview notes (not runtime)
├── docker-compose.yml        # postgres, redis, backend, frontend
├── .env.example              # Canonical env template
├── package.json              # Root scripts (concurrently, husky)
├── .husky/                   # pre-commit → lint-staged
├── CHANGELOG.md
└── README.md
```

**Not present:** `.github/workflows/`, `turbo.json`, `apps/`, `packages/shared-types/`.

---

## 2. Frontend (`frontend/`)

**Stack:** React 19, TypeScript, Vite, Tailwind, Shadcn UI, TanStack Query, React Router, Axios, Zod, RHF

```
frontend/
├── public/
├── src/
│   ├── app/                  # App shell, providers
│   ├── components/           # ui/ (Shadcn) + common + ai/
│   ├── features/
│   │   ├── auth/             # Live
│   │   ├── workspaces/       # Live (+ CalendarConnectCard)
│   │   ├── meetings/         # Live — capture, transcript, Meet
│   │   ├── chat/             # Meeting chat live; ChatPage soft-hidden
│   │   ├── notifications/    # Live (bell + preferences)
│   │   ├── tasks/            # Soft-hidden (full UI retained)
│   │   ├── dashboard/        # Soft-hidden
│   │   ├── insights/         # Soft-hidden
│   │   ├── search/           # Soft-hidden
│   │   ├── reports/          # Soft-hidden
│   │   └── knowledge/        # Soft-hidden
│   ├── hooks/                # e.g. useDebounce
│   ├── layouts/              # AppLayout, AuthLayout, nav-items (Meetings + Settings)
│   ├── lib/                  # api-client, constants, query-client
│   ├── routes/               # index.tsx, RedirectToMeetings, guards
│   ├── services/api/         # SSE stream client
│   ├── store/                # Unused placeholder
│   ├── types/
│   └── utils/
├── Dockerfile
├── .env.example              # VITE_API_URL only
└── package.json
```

### Live routes

| Path                                                         | Page                     |
| ------------------------------------------------------------ | ------------------------ |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth                     |
| `/auth/google/callback`                                      | Google OAuth return      |
| `/workspaces`                                                | Workspace list           |
| `/workspaces/:id/meetings`                                   | Meeting list             |
| `/workspaces/:id/meetings/:meetingId`                        | Meeting detail (lazy)    |
| `/workspaces/:id/settings`                                   | Settings + Calendar      |
| `/account/notifications`                                     | Notification preferences |
| `/invitations/:token/accept`                                 | Accept invite            |

Soft-hidden paths redirect to Meetings — see [feature-inventory.md](./feature-inventory.md).

---

## 3. Backend (`backend/`)

**Stack:** Node.js, Express 5, TypeScript, Prisma, BullMQ, LangGraph/LangChain, Jest

```
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/           # 14 migrations through google_auth_meet
├── prompts/                  # Versioned *.prompt.md + evaluations/
├── src/
│   ├── app.ts                # /health, /observability, /api/v1
│   ├── server.ts
│   ├── config/               # env, db, cors, redis
│   ├── middlewares/          # auth, RBAC, validation, rate limits
│   ├── routes/               # health, observability, api aggregator
│   ├── jobs/                 # Worker processors / entry
│   ├── lib/                  # jwt, cookies, email, openai helpers
│   └── modules/
│       ├── auth/
│       ├── users/
│       ├── workspaces/
│       ├── meetings/
│       ├── transcription/
│       ├── capture/          # imports + bot stubs
│       ├── ai/               # ai-output, action items
│       ├── calendar/
│       ├── chat/
│       ├── tasks/            # API retained
│       ├── dashboard/
│       ├── search/
│       ├── insights/
│       ├── reports/
│       ├── knowledge/
│       ├── notifications/
│       ├── llm/
│       ├── agents/
│       ├── orchestrator/
│       ├── rag/
│       ├── embeddings/
│       ├── vector/
│       ├── chunking/
│       ├── retrievers/
│       ├── prompts/
│       ├── jobs/
│       └── observability/
├── tests/                    # unit / integration / security / eval
├── Dockerfile
└── package.json
```

---

## 4. Root tooling

| Script                            | Behavior                        |
| --------------------------------- | ------------------------------- |
| `npm run dev`                     | Concurrently frontend + backend |
| `npm run build` / `lint` / `test` | Both packages via `--prefix`    |
| `npm run eval:prompts`            | Backend prompt fixtures         |
| `npm run seed:portfolio-demo`     | Demo seed                       |
| `prepare`                         | Husky                           |

Lint-staged: ESLint + Prettier on FE/BE TS; Prettier on md/json/css.

---

## 5. Docker

| Service    | Image / build                     | Port |
| ---------- | --------------------------------- | ---- |
| `postgres` | `pgvector/pgvector:pg16`          | 5432 |
| `redis`    | `redis:7-alpine`                  | 6379 |
| `backend`  | `./backend` target `development`  | 3001 |
| `frontend` | `./frontend` target `development` | 5173 |

Production multi-stage targets exist in each Dockerfile (frontend serves via nginx).

---

## 6. Documentation (`docs/`)

Index: [README.md](./README.md). Audit artifacts: [feature-inventory.md](./feature-inventory.md), [documentation-audit.md](./documentation-audit.md), [documentation-validation.md](./documentation-validation.md), [document-cleanup-report.md](./document-cleanup-report.md).

`career/` is for portfolio writing — keep version-aligned with product, but it is not runtime documentation.

---

## 7. Conventions

- Feature folders own pages, components, hooks, services, schemas
- Workspace membership enforced in backend middleware
- Soft-hide non-core UI via router redirect rather than deleting modules
- Env validated in `backend/src/config/env.ts`; template at repo `.env.example`
