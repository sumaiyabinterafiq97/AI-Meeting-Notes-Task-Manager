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
│   │   ├── features/         # Feature modules (auth, meetings, tasks…)
│   │   ├── hooks/            # Shared React hooks
│   │   ├── layouts/          # AppLayout, AuthLayout
│   │   ├── lib/              # API client, utils, constants
│   │   ├── pages/            # Route-level page components
│   │   ├── routes/           # Router config + guards
│   │   ├── services/         # API service layer
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

## API Endpoints (Scaffolded)

| Method | Path | Status |
|--------|------|--------|
| `GET` | `/health` | ✅ Active |
| `POST` | `/api/v1/auth/register` | 🔧 Scaffolded (validation only) |
| `POST` | `/api/v1/auth/login` | 🔧 Scaffolded (validation only) |
| `POST` | `/api/v1/auth/logout` | 🔧 Scaffolded (auth middleware) |

## Database Models

Initial Prisma models: `User`, `Workspace`, `WorkspaceMember`, `Meeting`, `Task`, `Comment`, `Notification`, `ActivityLog`.

See [`docs/erd.md`](./docs/erd.md) and [`docs/database-architecture.md`](./docs/database-architecture.md) for the full schema design.

## Documentation

Full architecture and requirements live in [`docs/`](./docs/):

- [requirements.md](./docs/requirements.md) — Product vision, personas, RBAC
- [system-architecture.md](./docs/system-architecture.md) — Canonical architecture
- [api-design.md](./docs/api-design.md) — REST API reference
- [project-structure.md](./docs/project-structure.md) — Detailed folder conventions

## Next Steps

This scaffold provides the foundation for feature development. Recommended implementation order:

1. **Auth** — Register, login, logout, JWT refresh
2. **Workspaces** — CRUD, invitations, member management
3. **Meetings** — CRUD, transcript upload
4. **AI Processing** — OpenAI integration, job queue
5. **Tasks** — Kanban board, comments, notifications

## License

Private — All rights reserved.
