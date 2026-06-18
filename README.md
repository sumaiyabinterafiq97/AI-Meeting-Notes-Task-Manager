# AI Meeting Notes & Task Manager

A production-grade SaaS application that converts meeting transcripts into AI-generated summaries, decisions, and action items — with collaborative task management in workspace-scoped teams.

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, TypeScript, Vite, React Router, TanStack Query, Axios, Tailwind CSS, Shadcn UI, React Hook Form, Zod |
| **Backend** | Node.js, Express 5, TypeScript, Prisma ORM, JWT, bcrypt |
| **Database** | PostgreSQL 16 |
| **DevOps** | Docker, Docker Compose |
| **Code Quality** | ESLint, Prettier, Husky, lint-staged |
| **Testing** | Vitest (frontend), Jest + Supertest (backend) |

## Project Structure

```
ai-meeting-notes-manager/
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── app/              # App shell, providers
│   │   ├── components/       # Shared UI (Shadcn) + common
│   │   ├── features/         # Feature modules (auth, workspaces, meetings, tasks…)
│   │   ├── hooks/            # Shared React hooks
│   │   ├── layouts/          # AppLayout, AuthLayout, mobile nav
│   │   ├── lib/              # API client, utils, constants
│   │   ├── routes/           # Router config + guards
│   │   ├── store/            # Client state
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Utility functions
│   ├── Dockerfile
│   └── package.json
├── backend/                  # Express API
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── migrations/       # Prisma migrations
│   ├── src/
│   │   ├── config/           # Env, database, CORS
│   │   ├── controllers/      # Shared controllers
│   │   ├── middlewares/      # Auth, validation, error handling
│   │   ├── modules/          # Feature modules (auth, workspaces…)
│   │   ├── routes/           # Route aggregation
│   │   ├── services/         # Shared services
│   │   ├── repositories/     # Data access layer
│   │   ├── validators/       # Shared validators
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Error classes, helpers
│   ├── tests/                # Jest tests
│   ├── Dockerfile
│   └── package.json
├── docs/                     # Architecture & requirements
├── docker-compose.yml        # Local dev orchestration
├── .env.example              # Environment template
└── package.json              # Root scripts + Husky
```

## Prerequisites

- Node.js 22+
- npm 10+
- Docker & Docker Compose (for containerized development)
- PostgreSQL 16 (if running without Docker)

## Local Setup

### 1. Clone and configure environment

```bash
cp .env.example .env
# Edit .env with your secrets (JWT secrets must be ≥ 32 characters)
```

### 2. Install dependencies

```bash
# Root (Husky + lint-staged)
npm install

# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install
```

### 3. Database setup

**Option A — Docker (recommended):**

```bash
docker compose up postgres -d
```

**Option B — Local PostgreSQL:**

Ensure PostgreSQL is running and `DATABASE_URL` in `.env` points to your instance.

### 4. Run Prisma migrations

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

### 5. Start development servers

```bash
# From project root — runs frontend + backend concurrently
npm run dev

# Or individually:
cd frontend && npm run dev    # http://localhost:5173
cd backend && npm run dev     # http://localhost:3001
```

## Docker Setup

Run the full stack (frontend, backend, PostgreSQL):

```bash
cp .env.example .env
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| Health check | http://localhost:3001/health |
| PostgreSQL | localhost:5432 |

## Environment Variables

See [`.env.example`](./.env.example) for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Access token signing secret (≥ 32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (≥ 32 chars) |
| `VITE_API_URL` | Frontend API base URL |
| `CORS_ORIGIN` | Allowed frontend origin |
| `API_PORT` | Backend server port (default: 3001) |

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend in dev mode |
| `npm run build` | Build both apps for production |
| `npm run lint` | Lint frontend and backend |
| `npm run test` | Run all tests |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run test` | Vitest unit tests |
| `npm run lint` | ESLint |

### Backend

| Command | Description |
|---------|-------------|
| `npm run dev` | tsx watch dev server |
| `npm run build` | TypeScript compile |
| `npm run test` | Jest tests |
| `npm run prisma:migrate` | Create/apply migrations |
| `npm run prisma:studio` | Prisma database GUI |

## API Endpoints

Full-stack MVP **v0.3.0** — see [`docs/api-design.md`](./docs/api-design.md) for the API reference and [`frontend/README.md`](./frontend/README.md) for UI routes.

| Domain | Base Path | Backend | Frontend |
|--------|-----------|---------|----------|
| Health | `GET /health` | ✅ | — |
| Auth | `/api/v1/auth/*` | ✅ | ✅ |
| Users | `/api/v1/users/*` | ✅ | ✅ |
| Workspaces | `/api/v1/workspaces/*` | ✅ | ✅ |
| Invitations | `/api/v1/invitations/*` | ✅ | ✅ |
| Meetings | `/api/v1/workspaces/:id/meetings/*` | ✅ | ✅ |
| AI processing | `.../meetings/:id/ai/*` | ✅ | ✅ |
| Tasks | `/api/v1/workspaces/:id/tasks/*` | ✅ | ✅ |
| Notifications | `/api/v1/notifications/*` | ✅ | ✅ |
| Dashboard | `/api/v1/workspaces/:id/dashboard` | ✅ | ✅ |
| Search | `/api/v1/workspaces/:id/search` | ✅ | ✅ |

**Auth highlights:** register, login, logout, refresh (httpOnly cookie), forgot/reset password, `GET /auth/me`

**AI dev mode:** set `AI_USE_MOCK=true` in `.env` to run without Redis or OpenAI locally.

## Database Models

Prisma models: `User`, `RefreshToken`, `PasswordResetToken`, `Workspace`, `WorkspaceMember`, `WorkspaceInvitation`, `Meeting`, `MeetingTranscript`, `MeetingAiOutput`, `ActionItemSuggestion`, `AiProcessingJob`, `Task`, `TaskStatusHistory`, `Comment`, `Notification`, `NotificationPreference`, `ActivityLog`.

See [`docs/erd.md`](./docs/erd.md) and [`docs/database-architecture.md`](./docs/database-architecture.md) for the full schema design.

## Documentation

Full architecture and requirements live in [`docs/`](./docs/):

- [requirements.md](./docs/requirements.md) — Product vision, personas, RBAC
- [system-architecture.md](./docs/system-architecture.md) — Canonical architecture
- [api-design.md](./docs/api-design.md) — REST API reference
- [project-structure.md](./docs/project-structure.md) — Detailed folder conventions

## Next Steps

Full-stack MVP is complete (v0.3.0). Recommended next phase:

1. **E2E tests** — Playwright or Cypress flows for auth, meetings, and tasks
2. **Email delivery** — Wire invitation and password-reset emails (SMTP/Resend)
3. **Production deploy** — Docker production config, env secrets, CI/CD pipeline
4. **Performance** — Frontend code-splitting, API pagination tuning
5. **Polish** — Accessibility audit, error boundaries, offline handling

## License

Private — All rights reserved.
