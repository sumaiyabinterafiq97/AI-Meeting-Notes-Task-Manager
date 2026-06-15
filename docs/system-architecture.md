# System Architecture

**Product:** AI Meeting Notes & Task Manager  
**Version:** 1.0  
**Status:** Canonical Architecture Reference  
**Supersedes:** [architecture.md](./architecture.md) (retained for historical reference)

---

## 1. High-Level Architecture

```mermaid
flowchart TB
    subgraph Users["Users"]
        Browser[Web Browser]
    end

    subgraph Frontend["Frontend — Vercel"]
        React[React SPA]
        RQ[React Query]
        AuthState[Auth State — Memory]
    end

    subgraph AuthLayer["Authentication Layer"]
        JWT[JWT Access Tokens]
        Refresh[Refresh Token Cookie]
        RBAC[RBAC Middleware]
    end

    subgraph Backend["Backend API — Railway/Render"]
        Express[Express + TypeScript]
        Services[Domain Services]
        Worker[Background Worker]
    end

    subgraph Queue["Job Queue"]
        Redis[(Upstash Redis)]
        BullMQ[BullMQ]
    end

    subgraph Data["Data Layer"]
        Prisma[Prisma ORM]
        PG[(Neon PostgreSQL)]
    end

    subgraph Storage["Storage Layer"]
        DBText[Transcript TEXT — MVP]
        ObjectStore[Object Storage — v2]
    end

    subgraph AI["OpenAI Services"]
        GPT[Chat Completions API]
        Schema[Structured JSON Output]
    end

    subgraph Notify["Notification Services"]
        InApp[In-App Notifications DB]
        Email[Email Provider — Resend/SendGrid]
    end

    Browser --> React
    React --> RQ
    RQ -->|HTTPS REST /api/v1| Express
    React --> AuthState
    AuthState -->|Bearer JWT| JWT

    Express --> RBAC
    RBAC --> Services
    Services --> Prisma --> PG
    Services --> BullMQ
    BullMQ --> Redis
    BullMQ --> Worker
    Worker --> GPT
    Worker --> Schema
    Worker --> Prisma

    Services --> DBText
    DBText -.->|migrate v2| ObjectStore

    Services --> InApp
    Services --> Email
    Refresh -->|httpOnly cookie| Express
```

### Architecture Explanation

The system follows a **classic three-tier SaaS pattern** with async AI processing:

1. **Frontend (React SPA)** — Deployed on Vercel as static assets. Handles UI, routing, client-side state, and API communication via React Query. Access tokens live in memory only; refresh tokens in httpOnly cookies.

2. **Authentication Layer** — Stateless JWT access tokens (15 min) validated on every request. Refresh tokens (7 days) stored hashed in PostgreSQL, delivered via httpOnly `SameSite=Strict` cookies. RBAC middleware enforces workspace membership and roles.

3. **Backend API (Express)** — Thin controllers delegate to domain services. All business logic, authorization, and validation live in services. Stateless and horizontally scalable.

4. **Job Queue (BullMQ + Redis)** — AI processing is never synchronous in the request path. Transcript upload enqueues a job; worker processes OpenAI calls independently. Enables retries, horizontal scaling, and deploy safety.

5. **Database (Neon PostgreSQL)** — Single source of truth. Prisma ORM with workspace-scoped queries. Connection pooling via Neon pooler endpoint.

6. **OpenAI Services** — GPT-4o (or equivalent) with structured JSON schema output. Worker sends transcript + member names; receives summary, decisions, risks, action items.

7. **Notification Services** — In-app notifications persisted in DB (MVP). Email via transactional provider for password reset, invitations, and optional task reminders (MVP+1).

8. **Storage Layer** — MVP stores transcripts as PostgreSQL TEXT (≤ 5 MB). v2 migrates to S3/R2 with `storage_key` reference for cost and backup efficiency.

---

## 2. Component Architecture

### 2.1 Frontend Components

```mermaid
flowchart TB
    subgraph AppShell["App Shell"]
        Router[React Router]
        Providers[Providers — Query, Theme, Auth]
        Layout[Layout — Sidebar, Header]
    end

    subgraph Modules["Feature Modules"]
        AuthMod[Authentication Module]
        WSMod[Workspace Module]
        DashMod[Dashboard Module]
        MeetMod[Meeting Module]
        TaskMod[Task Module]
        NotifMod[Notification Module]
        SearchMod[Search Module]
    end

    subgraph Shared["Shared"]
        UI[Shadcn UI Components]
        API[API Client + Interceptors]
        Hooks[Shared Hooks]
    end

    Router --> Providers --> Layout
    Layout --> Modules
    Modules --> Shared
```

| Module | Responsibility | Key Pages / Components |
|--------|----------------|------------------------|
| **Authentication** | Login, register, password reset, session management | `LoginPage`, `RegisterPage`, `AuthProvider`, `ProtectedRoute` |
| **Workspace** | CRUD workspaces, invitations, member management, switcher | `WorkspaceList`, `WorkspaceSettings`, `InviteMemberForm`, `WorkspaceSwitcher` |
| **Dashboard** | Stats cards, activity feed, productivity charts | `DashboardPage`, `StatCards`, `ActivityFeed`, `ProductivityChart` |
| **Meeting** | Meeting CRUD, transcript upload, AI output display, action item review | `MeetingList`, `MeetingDetail`, `TranscriptUpload`, `AIOutputPanel`, `ActionItemReview` |
| **Task** | Kanban board, task CRUD, comments, assignment | `KanbanBoard`, `TaskCard`, `TaskDetailDrawer`, `CommentThread` |
| **Notification** | Bell icon, notification list, read state | `NotificationBell`, `NotificationDropdown`, `NotificationItem` |
| **Search** | Global search bar, results page | `SearchBar`, `SearchResults` |

### 2.2 Backend Components

```mermaid
flowchart TB
    subgraph HTTP["HTTP Layer"]
        Routes[Routes / Controllers]
        MW[Middleware Stack]
    end

    subgraph Services["Domain Services"]
        AuthSvc[Auth Service]
        UserSvc[User Service]
        WsSvc[Workspace Service]
        MeetSvc[Meeting Service]
        AISvc[AI Service]
        TaskSvc[Task Service]
        CommentSvc[Comment Service]
        NotifSvc[Notification Service]
        DashSvc[Dashboard Service]
        SearchSvc[Search Service]
    end

    subgraph Infra["Infrastructure"]
        Prisma[Prisma Client]
        Queue[Queue Producer]
        OpenAI[OpenAI Client]
        Email[Email Client]
    end

    subgraph Worker["Worker Process"]
        JobWorker[AI Job Worker]
    end

    Routes --> MW --> Services
    Services --> Prisma
    Services --> Queue
    Queue --> JobWorker
    JobWorker --> AISvc
    AISvc --> OpenAI
    Services --> Email
    TaskSvc --> NotifSvc
    CommentSvc --> NotifSvc
```

| Service | Responsibility |
|---------|----------------|
| **Auth Service** | Register, login, logout, refresh rotation, password reset, token revocation |
| **User Service** | Profile CRUD, notification preferences |
| **Workspace Service** | Workspace CRUD, slug generation, soft delete |
| **Meeting Service** | Meeting CRUD, transcript storage, status transitions, enqueue AI jobs |
| **AI Service** | OpenAI prompt construction, response parsing, assignee matching, output persistence |
| **Task Service** | Task CRUD, status transitions, history logging, action-item conversion |
| **Comment Service** | Comment CRUD, @mention parsing, mention notifications |
| **Notification Service** | Create, list, mark read notifications; email dispatch (MVP+1) |
| **Dashboard Service** | Aggregate stats, activity feed queries |
| **Search Service** | Full-text and filtered search across meetings/tasks |

---

## 3. Request Flow Diagrams

### 3.1 User Login Flow

```mermaid
sequenceDiagram
    actor U as User
    participant FE as React App
    participant API as Auth Service
    participant DB as PostgreSQL

    U->>FE: Enter email + password
    FE->>API: POST /api/v1/auth/login
    API->>DB: Find user by email
    API->>API: bcrypt.compare(password)
    alt Invalid credentials
        API-->>FE: 401 UNAUTHORIZED
    else Valid
        API->>API: Generate access JWT (15m)
        API->>DB: Store refresh token hash
        API-->>FE: 200 { user, accessToken }
        API-->>FE: Set-Cookie refreshToken (httpOnly, Secure, SameSite=Strict)
        FE->>FE: Store accessToken in memory
        FE->>FE: Redirect to /workspaces
    end
```

**Explanation:** Password verified with bcrypt. Access token returned in JSON body and held in React memory (never localStorage). Refresh token set as httpOnly cookie for silent renewal.

---

### 3.2 Meeting Upload Flow

```mermaid
sequenceDiagram
    actor U as User
    participant FE as Meeting Module
    participant API as Meeting Service
    participant DB as PostgreSQL
    participant Q as BullMQ

    U->>FE: Paste/upload transcript
    FE->>FE: Client-side validation (length, size)
    FE->>API: PUT /workspaces/:id/meetings/:id/transcript
    API->>API: Verify workspace membership
    API->>DB: Check meeting.status != PROCESSING
    alt Already processing
        API-->>FE: 409 CONFLICT
    else OK
        API->>DB: Upsert transcript, status=PROCESSING
        API->>DB: Create ai_processing_job (PENDING)
        API->>Q: Enqueue process-meeting job
        API-->>FE: 200 { status: PROCESSING }
        FE->>FE: Start polling meeting status (React Query 3s interval)
    end
```

**Explanation:** Transcript upload is atomic. Concurrent uploads rejected. Job record created before enqueue for durability.

---

### 3.3 AI Processing Flow

```mermaid
sequenceDiagram
    participant Q as BullMQ
    participant W as AI Worker
    participant DB as PostgreSQL
    participant OAI as OpenAI API
    participant FE as React (polling)

    Q->>W: Dequeue process-meeting job
    W->>DB: Load job, transcript, workspace members
    W->>DB: Update job status=PROCESSING
    W->>OAI: Chat completion (JSON schema)
    alt OpenAI success
        OAI-->>W: Structured JSON response
        W->>W: Parse + validate schema
        W->>W: Fuzzy-match assignees to member IDs
        W->>DB: Save meeting_ai_output
        W->>DB: Create action_item_suggestions
        W->>DB: meeting.status=READY, job.status=COMPLETED
    else OpenAI failure (retry < 3)
        W->>W: Exponential backoff
        W->>Q: Re-enqueue job
    else Max retries exceeded
        W->>DB: meeting.status=FAILED, job.status=FAILED
    end
    FE->>DB: GET meeting (poll)
    DB-->>FE: status READY + AI output
    FE->>FE: Stop polling, render results
```

**Explanation:** Worker is idempotent — checks job status before processing. Retries transient OpenAI errors. Frontend polls until terminal state.

---

### 3.4 Task Generation Flow

```mermaid
sequenceDiagram
    actor U as User
    participant FE as Action Item Review
    participant API as Task Service
    participant DB as PostgreSQL
    participant NS as Notification Service

    U->>FE: Select action items + click Accept
    FE->>API: POST .../action-items/accept { actionItemIds, overrides }
    API->>API: Validate all IDs belong to meeting, status=PENDING
    API->>DB: BEGIN TRANSACTION
    loop Each action item
        API->>DB: INSERT task (action_item_id UNIQUE)
        API->>DB: UPDATE action_item status=ACCEPTED
        alt Assignee set
            API->>NS: Create TASK_ASSIGNED notification
        end
    end
    API->>DB: COMMIT
    API-->>FE: 201 { tasks: [...] }
    FE->>FE: Navigate to Kanban / show success toast
```

**Explanation:** Transaction ensures atomicity. `action_item_id` unique constraint prevents duplicate tasks on retry. Notifications created inside transaction or via outbox (MVP: inline).

---

### 3.5 Task Update Flow

```mermaid
sequenceDiagram
    actor U as User
    participant FE as Kanban Board
    participant API as Task Service
    participant DB as PostgreSQL
    participant NS as Notification Service

    U->>FE: Drag task to In Progress
    FE->>FE: Optimistic UI update (MVP+1)
    FE->>API: PATCH /workspaces/:id/tasks/:taskId { status: IN_PROGRESS }
    API->>API: Verify workspace membership
    API->>DB: Load current task
    API->>DB: UPDATE task.status
    API->>DB: INSERT task_status_history
    alt Assignee changed
        API->>NS: TASK_ASSIGNED notification
    end
    API-->>FE: 200 { updated task }
    alt Error
        FE->>FE: Rollback optimistic update
    end
```

**Explanation:** Every status change logged in history. Assignee changes trigger notifications. Kanban uses PATCH for MVP; optimistic UI in MVP+1.

---

## 4. Deployment View

| Environment | Frontend | API | Worker | DB | Redis |
|-------------|----------|-----|--------|-----|-------|
| Local | Vite dev :5173 | :3001 | Same process | Docker PG | Docker Redis |
| Staging | Vercel preview | Railway staging | Railway worker | Neon branch | Upstash |
| Production | Vercel prod | Railway prod | Railway worker | Neon prod | Upstash |

---

## 5. Related Documents

- [security-architecture.md](./security-architecture.md)
- [database-architecture.md](./database-architecture.md)
- [scalability-design.md](./scalability-design.md)
- [api-architecture-review.md](./api-architecture-review.md)
- [project-structure.md](./project-structure.md)
