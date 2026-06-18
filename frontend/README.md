# AI Meeting Notes & Task Manager — Frontend

React SPA for workspace-scoped meeting notes, AI summaries, and task management.

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
| `/workspaces/:id/dashboard` | Dashboard | Workspace stats, productivity chart, activity feed |

### User Flows

1. **Stats** — Open tasks, overdue tasks, meetings, completed this week
2. **Productivity** — Weekly completion bar chart + average days to complete
3. **Activity** — Recent actions with links to meetings/tasks

### Feature Module

```
src/features/dashboard/
├── components/     # StatsGrid, ProductivityChart, ActivityFeed
├── hooks/          # useDashboard
├── pages/          # DashboardPage
├── services/       # dashboard-api.ts
└── types/          # TypeScript interfaces
```

## Search

### UI

Search input in the app header on large screens (`xl+`, 1280px) with a dropdown results panel. On phones and tablets below that breakpoint, a search icon opens a full-screen search panel.

### User Flows

1. **Query** — Debounced search after 2+ characters via `GET /workspaces/:id/search`
2. **Filter** — Toggle All, Meetings, or Tasks result types
3. **Results** — Meetings, tasks, and AI summary snippets grouped in the panel
4. **Navigate** — Click a result to open the meeting detail or task board (with deep link)
5. **Mobile / tablet** — Tap the header search icon to open the full-screen search panel

### Feature Module

```
src/features/search/
├── components/     # GlobalSearch, MobileSearch, SearchResultsPanel
├── hooks/          # useSearch, useWorkspaceSearch
├── services/       # search-api.ts
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

## Project Structure

Feature-based architecture under `src/features/`. Shared UI in `src/components/`, API client in `src/lib/api-client.ts`.
