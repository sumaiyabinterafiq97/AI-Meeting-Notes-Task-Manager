# AI Meeting Notes & Task Manager — Frontend

React SPA for workspace-scoped meeting notes, AI summaries, task management, and **MeetingMind AI** — conversational search, insights, reports, and a workspace knowledge base.

## MeetingMind AI

MeetingMind AI extends the core app with streaming chat, semantic search, meeting insights, weekly reports, and a searchable knowledge base. Shared AI UI lives in `src/components/ai/`; SSE streaming utilities live in `src/services/api/`.

### Workspace routes

| Route | Feature | Description |
|-------|---------|-------------|
| `/workspaces/:id/dashboard` | Dashboard | AI metrics, recommendations, tasks due soon |
| `/workspaces/:id/insights` | Insights hub | Workspace trends, risks, decisions, search links |
| `/workspaces/:id/meetings/:meetingId` | Meetings + Insights | Meeting detail with insights/chat hero tabs |
| `/workspaces/:id/search` | Semantic search | Full-page search with filters and snippets |
| `/workspaces/:id/chat` | Workspace chat | Multi-session AI chat with sidebar |
| `/workspaces/:id/chat/:sessionId` | Workspace chat | Deep link to a chat session |
| `/workspaces/:id/reports` | Reports | Weekly report list and generation |
| `/workspaces/:id/reports/:reportId` | Reports | Report detail, charts, markdown export |
| `/workspaces/:id/knowledge` | Knowledge base | Decisions, facts, and semantic search link |

Heavy routes (search, chat, reports, knowledge, meeting detail) are **lazy-loaded** with `React.lazy` and a shared `PageLoader` fallback. Vite splits `recharts` and markdown libraries into separate chunks for faster initial load.

## Stack

- React 19 + TypeScript + Vite
- React Router 7
- TanStack Query
- Axios
- Tailwind CSS 4 + Shadcn UI primitives
- React Hook Form + Zod

## Getting Started

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Set `VITE_API_URL` to your backend API base (default: `http://localhost:3001/api/v1`).

## Authentication

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | Email/password sign in |
| `/register` | Register | Create a new account |
| `/forgot-password` | Forgot Password | Request password reset email |
| `/reset-password?token=...` | Reset Password | Set a new password via email link |

### User Flows

1. **Register** — User creates account → receives access token + httpOnly refresh cookie → redirected to `/workspaces`
2. **Login** — User signs in → session established → redirected to `/workspaces`
3. **Session restore** — On app load, refresh token cookie is used to silently restore session via `POST /auth/refresh` + `GET /auth/me`
4. **Logout** — User signs out from app header → refresh token revoked → redirected to login
5. **Forgot password** — User submits email → success message shown (generic, no email enumeration)
6. **Reset password** — User opens email link with `?token=` → sets new password

### Feature Module

```
src/features/auth/
├── components/     # LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm
├── context/        # AuthProvider (session state)
├── hooks/          # useLogin, useRegister, useForgotPassword, useResetPassword
├── pages/          # Thin page wrappers
├── schemas/        # Zod validation schemas
└── services/       # auth-api.ts (API calls)
```

### Protected Routes

Routes under `/workspaces` require authentication. Unauthenticated users are redirected to `/login`. Public auth routes redirect authenticated users to `/workspaces`.

## Workspaces

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/workspaces` | Workspace List | View, select, or create workspaces |
| `/workspaces/:id/settings` | Settings | Edit workspace, manage members, send invites |
| `/invitations/:token/accept` | Accept Invitation | Join a workspace via email invite link |

### User Flows

1. **List** — After login, user sees all workspaces they belong to
2. **Create** — Owner creates workspace with name + optional description → redirected to dashboard
3. **Switch** — Header switcher changes active workspace and navigates to its dashboard
4. **Settings** — Owners can edit workspace details, invite members, view pending invites, change roles, remove members
5. **Accept invite** — Authenticated user opens `/invitations/:token/accept` → joins workspace → redirected to dashboard

### Feature Module

```
src/features/workspaces/
├── components/     # WorkspaceCard, WorkspaceSwitcher, MemberList, InviteMemberForm, etc.
├── context/        # WorkspaceProvider (active workspace persistence)
├── hooks/          # useWorkspaces, useCreateWorkspace, useInviteMember, etc.
├── pages/          # WorkspaceListPage, WorkspaceSettingsPage, AcceptInvitationPage
├── schemas/        # Zod validation schemas
├── services/       # workspace-api.ts
└── types/          # TypeScript interfaces
```

## Meetings

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/workspaces/:id/meetings` | Meeting List | Browse, search, and filter meetings |
| `/workspaces/:id/meetings/:meetingId` | Meeting Detail | View metadata, upload transcript, track AI status |

### User Flows

1. **List** — Paginated meeting history with search and status filters
2. **Create** — New meeting dialog with title, date, attendees, tags
3. **Upload transcript** — Paste or upload `.txt`, `.md`, `.vtt`, `.srt` (min 100 chars, max 5MB)
4. **Processing** — Status badge + auto-polling every 3s while `PROCESSING`
5. **Ready** — AI summary preview shown on detail page when complete
6. **Reprocess** — Re-run AI analysis on an existing transcript (when not processing)
7. **Action items** — Review extracted items; accept to create tasks or reject to dismiss

### Feature Module

```
src/features/meetings/
├── components/     # MeetingCard, TranscriptUpload, ActionItemReview, ProcessingStatusBadge, etc.
├── hooks/          # useMeetings, useMeeting, useUploadTranscript, useReprocessMeeting, useAcceptActionItems
├── pages/          # MeetingListPage, MeetingDetailPage
├── schemas/        # Zod validation schemas
├── services/       # meeting-api.ts
└── types/          # TypeScript interfaces
```

## Tasks

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/workspaces/:id/tasks` | Task Board | Kanban view with To Do, In Progress, and Done columns |

### User Flows

1. **Board** — Three-column Kanban loaded from `GET /tasks/board`
2. **Create** — New task dialog with title, description, assignee, due date, priority
3. **Move** — Arrow buttons on cards or status dropdown in detail dialog
4. **Detail** — Edit metadata, delete task, view/post comments with @mention autocomplete
5. **Filter** — Filter board by assignee
6. **Deep link** — Open `/tasks?taskId=...` to jump straight to task detail
7. **Drag-and-drop** — Move cards between columns

### Feature Module

```
src/features/tasks/
├── components/     # TaskCard, KanbanColumn, CreateTaskDialog, TaskDetailDialog, etc.
├── hooks/          # useTaskBoard, useTask, useCreateTask, useUpdateTask, useTaskComments
├── pages/          # TaskBoardPage
├── schemas/        # Zod validation schemas
├── services/       # task-api.ts
└── types/          # TypeScript interfaces
```

## Dashboard

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/workspaces/:id/dashboard` | Dashboard | Workspace stats, AI metrics, recommendations, tasks due, insights |

### User Flows

1. **Stats** — Open tasks, overdue tasks, meetings, completed this week
2. **AI metrics** — Summaries generated, pending action item reviews, processing failures
3. **Recommendations** — Rule-based follow-ups from risks and pending action items
4. **Recent meetings** — Quick links to latest meetings with AI summary badges
5. **Tasks due soon** — Open tasks due within 7 days with link to task board
6. **Productivity insights** — Workspace trends and optional AI narrative (`GET /insights`)
7. **Productivity** — Weekly completion bar chart + average days to complete
8. **Activity** — Recent actions with links to meetings/tasks

### Feature Module

```
src/features/dashboard/
├── components/     # StatsGrid, AiMetricsGrid, RecommendationsRow, RecentMeetingsStrip, TasksDueSoon, AiInsightsCard, ProductivityChart, ActivityFeed
├── hooks/          # useDashboard, useDashboardInsights
├── pages/          # DashboardPage
├── services/       # dashboard-api.ts, insights-api.ts
└── types/          # TypeScript interfaces
```

## Search

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/workspaces/:id/search` | Search | Full-page semantic search with filters |

### UI

Search input in the app header on large screens (`xl+`, 1280px) with a dropdown results panel. On phones and tablets below that breakpoint, a search icon opens a full-screen search panel.

### User Flows

1. **Query** — Debounced hybrid search via `GET /workspaces/:id/search?mode=hybrid`
2. **Filter** — Toggle All, Meetings, or Tasks; set mode (Hybrid / Semantic / Keyword)
3. **Advanced** — Full search page with date range and source type filters
4. **Results** — Meetings, tasks, and semantic snippet cards with match badges and highlights
5. **History** — Recent searches stored per workspace in `localStorage`
6. **Degraded mode** — Banner when semantic retrieval falls back to keyword-only
7. **Navigate** — Click a result to open the meeting detail or task board (with deep link)
8. **Mobile / tablet** — Tap the header search icon to open the full-screen search panel

### Feature Module

```
src/features/search/
├── components/     # GlobalSearch, MobileSearch, SearchResultsPanel, SearchSnippetCard, etc.
├── hooks/          # useSearch, useWorkspaceSearch, useSemanticSearch, useRecentSearches
├── lib/            # recent-searches, highlight-query
├── pages/          # SearchPage
├── services/       # search-api.ts
└── types/          # TypeScript interfaces
```

## Meeting AI Chat (MeetingMind AI)

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/workspaces/:id/chat` | Chat | New workspace chat conversation |
| `/workspaces/:id/chat/:sessionId` | Chat | Resume a workspace chat session |

### UI

- **Meeting chat** — Panel on the meeting detail page
- **Workspace chat** — Full-page ChatGPT-style layout with session sidebar (`xl+`) and slide-over session list on mobile

### User Flows

#### Meeting chat
1. **Open** — On meeting detail after a transcript is uploaded
2. **Ask** — Natural language questions grounded in transcript + AI outputs
3. **Stream** — SSE tokens via `POST /workspaces/:id/meetings/:meetingId/chat`
4. **Citations** — Source cards link back to the meeting
5. **History** — Thread persisted per meeting via `GET .../chat`

#### Workspace chat
1. **New chat** — Start from `/chat` or sidebar **New chat**
2. **Sessions** — List via `GET /workspaces/:id/chat/sessions`; deep link `/chat/:sessionId`
3. **Stream** — SSE via `POST /workspaces/:id/chat` with optional `sessionId`
4. **Delete** — Clear session via `DELETE /workspaces/:id/chat/sessions/:sessionId`
5. **Mobile** — Header chat icon + slide-over session list

### Feature Module

```
src/features/chat/
├── components/     # MeetingChatPanel, WorkspaceChatPanel, ChatSidebar, ChatSessionList, ChatComposer, ChatMessageList
├── hooks/          # useMeetingChat*, useChatSessions, useChatSessionMessages, useWorkspaceChatStream
├── pages/          # ChatPage
├── schemas/        # Zod validation
├── services/       # chat-api.ts
└── types/          # TypeScript interfaces

src/services/api/   # stream-client, SSE parser, retry helpers
src/components/ai/  # ChatBubble, CitationCard, MarkdownRenderer, TypingIndicator
```

## Weekly Reports (MeetingMind AI)

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/workspaces/:id/reports` | Reports | Report history and on-demand generation |
| `/workspaces/:id/reports/:reportId` | Report detail | Metrics charts, sections, markdown export |

### User Flows

1. **List** — `GET /workspaces/:id/reports` shows past weekly reports
2. **Generate** — Select date range → `POST /workspaces/:id/reports/generate`
3. **Detail** — Task throughput chart (Recharts), meeting count, structured sections
4. **Export** — Download completed report as Markdown (client-side)
5. **Regenerate** — Re-run generation for the same period

### Feature Module

```
src/features/reports/
├── components/     # ReportCard, ReportMetricsChart, ReportGeneratePanel, ReportExportMenu
├── hooks/          # useReports, useReport, useGenerateReport
├── lib/            # parse-report-content, export-report
├── pages/          # ReportsListPage, ReportDetailPage
├── services/       # report-api.ts
└── types/          # TypeScript interfaces
```

## Knowledge Base (MeetingMind AI)

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/workspaces/:id/knowledge` | Knowledge | Filterable knowledge entries, detail panel, decision timeline |

### User Flows

1. **Browse** — `GET /workspaces/:id/knowledge` with optional `entityType` filter
2. **Filter** — Client-side search + entity type chips (Decisions, People, Projects, etc.)
3. **Detail** — `GET /workspaces/:id/knowledge/:entryId` in side panel (desktop) or slide-over (mobile)
4. **Timeline** — Decision entries shown chronologically with source meeting links
5. **Semantic search** — Link to advanced search pre-filtered to knowledge sources

### Feature Module

```
src/features/knowledge/
├── components/     # KnowledgeEntryCard, KnowledgeFilters, KnowledgeDetailPanel, DecisionTimeline
├── hooks/          # useKnowledgeEntries, useKnowledgeEntry
├── lib/            # knowledge-utils
├── pages/          # KnowledgePage
├── services/       # knowledge-api.ts
└── types/          # TypeScript interfaces
```

## Meeting Insights (MeetingMind AI)

### UI

Tabbed **Meeting Insights** panel on the meeting detail page: Summary, Actions, Decisions, Risks, Tips, and Knowledge links.

### User Flows

1. **Summary** — AI summary, key topics, model metadata
2. **Actions** — Accept/reject extracted action items (existing workflow)
3. **Decisions / Risks** — Expandable insight cards with severity badges
4. **Tips** — Rule-based follow-up recommendations from risks and pending actions
5. **Knowledge** — Entries from `GET /workspaces/:id/knowledge` filtered by meeting

### Feature Module

```
src/features/insights/
├── components/     # MeetingInsightsPanel, DecisionsList, RisksList, etc.
├── hooks/          # useMeetingKnowledge
├── lib/            # parse-meeting-insights
├── services/       # knowledge-api.ts
└── types/          # TypeScript interfaces
```

### Mobile & tablet navigation

Below the `xl` breakpoint (1280px):

- **Bottom tab bar** — Fixed navigation for Dashboard, Meetings, Tasks, and Settings
- **Header** — Sticky bar with menu (all workspaces), workspace switcher, search, notifications, and sign out
- **Menu slide-over** — Hamburger opens workspace links and “All workspaces”

Desktop layout with a persistent sidebar appears at `xl+`.

Shared mention helpers live in `src/lib/mentions.ts`; `MentionTextarea` powers @mention autocomplete in comment fields.

## Notifications

### UI

Bell icon in the app header (workspace layout) with unread badge and dropdown panel.

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/account/notifications` | Notification Preferences | Configure email and in-app notification settings |

### User Flows

1. **Badge** — Unread count polls every 30s via `GET /notifications?unreadOnly=true`
2. **Dropdown** — Recent notifications with message, timestamp, and unread styling
3. **Navigate** — Click a notification to open the linked task or meeting
4. **Mark read** — Single notification marked read on click; **Mark all read** clears all
5. **Preferences** — Open **Notification settings** from the dropdown or visit `/account/notifications`; toggles auto-save via `PATCH /users/me/notification-preferences`

### Feature Module

```
src/features/notifications/
├── components/     # NotificationBell, NotificationItem
├── hooks/          # useNotifications, useNotificationPreferences, useUpdateNotificationPreferences
├── lib/            # format-notification (messages + deep links)
├── pages/          # NotificationPreferencesPage
├── services/       # notification-api.ts
└── types/          # TypeScript interfaces
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 5173) |
| `npm run build` | Production build |
| `npm run test` | Run Vitest tests |
| `npm run lint` | ESLint |

### Testing & accessibility

- Unit and integration tests use **Vitest** + **Testing Library** (`src/test/render-with-providers.tsx` for app context).
- Accessibility checks use **vitest-axe** on key interactive components (e.g. `ChatComposer`, `SearchSnippetCard`). Run `npm run test` — a11y suites are named `*.a11y.test.tsx`.
- When adding forms or result lists, prefer semantic roles, labels, and keyboard-focusable controls so axe checks stay green.

### Performance notes

- Route-level code splitting for chat, search, reports, knowledge, and meeting detail.
- Manual Rollup chunks for `recharts` and markdown (`react-markdown`, `remark-gfm`, `rehype-sanitize`) in `vite.config.ts`.
- TanStack Query caches API responses; streaming endpoints bypass cache and use SSE via `stream-client.ts`.

## Project Structure

Feature-based architecture under `src/features/`. Shared UI in `src/components/`, centralized streaming in `src/services/api/`, REST client in `src/lib/api-client.ts`.
