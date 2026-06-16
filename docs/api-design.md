# API Design

**Product:** AI Meeting Notes & Task Manager  
**Version:** 1.1  
**Base URL:** `https://api.example.com/api/v1`

> **Architecture review:** [api-architecture-review.md](./api-architecture-review.md)  
> Improvements: idempotency keys, refresh token rotation, rate limit headers, `X-Request-Id`, standardized error `requestId`.

---

## 1. Conventions

### Authentication

- **Public endpoints:** No auth required
- **Protected endpoints:** `Authorization: Bearer <access_token>`
- **Refresh:** httpOnly cookie `refreshToken` on `/auth/refresh`

### Request / Response Format

- Content-Type: `application/json`
- Dates: ISO 8601 (`2026-06-15T10:30:00.000Z`)
- UUIDs: RFC 4122 format

### Pagination

Query params: `?page=1&limit=20` (default limit: 20, max: 100)

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### Error Codes

| HTTP | Code | Description |
|------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid input |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Duplicate resource |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

---

## 2. Authentication

> **Status:** Implemented (v1.0) — register, login, logout, refresh, forgot/reset password, `GET /auth/me`. Refresh token delivered via httpOnly cookie `refreshToken` on register/login; rotated on refresh. Rate limits active in non-test environments.

### POST `/auth/register`

| | |
|--|--|
| **Auth** | None |
| **Body** | `{ "email": "string", "password": "string", "displayName": "string" }` |
| **Validation** | email: valid format; password: ≥ 8 chars, letter + number; displayName: 2–100 chars |
| **Response 201** | `{ "user": { "id", "email", "displayName" }, "accessToken": "..." }` + Set-Cookie refresh |
| **Errors** | 400 validation, 409 email exists |

### POST `/auth/login`

| | |
|--|--|
| **Auth** | None |
| **Body** | `{ "email": "string", "password": "string" }` |
| **Response 200** | `{ "user": { "id", "email", "displayName", "avatarUrl" }, "accessToken": "..." }` + refresh cookie |
| **Errors** | 401 invalid credentials, 429 rate limited |

### POST `/auth/logout`

| | |
|--|--|
| **Auth** | Required |
| **Response 204** | No body; clears refresh cookie |

### POST `/auth/refresh`

| | |
|--|--|
| **Auth** | Refresh cookie |
| **Response 200** | `{ "accessToken": "..." }` |
| **Errors** | 401 invalid/expired refresh token |

### POST `/auth/forgot-password`

| | |
|--|--|
| **Auth** | None |
| **Body** | `{ "email": "string" }` |
| **Response 200** | `{ "message": "If an account exists, a reset email has been sent" }` |

### POST `/auth/reset-password`

| | |
|--|--|
| **Auth** | None |
| **Body** | `{ "token": "string", "password": "string" }` |
| **Validation** | password meets registration rules |
| **Response 200** | `{ "message": "Password updated successfully" }` |
| **Errors** | 400 invalid/expired token |

### PATCH `/users/me`

| | |
|--|--|
| **Auth** | Required |
| **Body** | `{ "displayName?": "string", "avatarUrl?": "string" }` |
| **Response 200** | Updated user object |

### GET `/auth/me`

| | |
|--|--|
| **Auth** | Required |
| **Response 200** | `{ "id", "email", "displayName", "avatarUrl", "createdAt" }` |

> **Status:** Implemented (v1.0) — includes `PATCH /users/me` for profile updates. Password reset emails sent via Resend when `EMAIL_API_KEY` is set.

---

## 3. Workspaces

> **Status:** Implemented (v1.0) — CRUD, invitations, member management, RBAC via `requireWorkspaceMember` + `requireRole`. Workspace limit: `MAX_WORKSPACES_PER_USER` (default 10). Invitations expire after `INVITATION_EXPIRES_DAYS` (default 7).

### POST `/workspaces`

| | |
|--|--|
| **Auth** | Required |
| **Body** | `{ "name": "string", "description?": "string" }` |
| **Validation** | name: 3–100 chars |
| **Response 201** | `{ "id", "name", "slug", "description", "role": "OWNER", "createdAt" }` |

### GET `/workspaces`

| | |
|--|--|
| **Auth** | Required |
| **Response 200** | `{ "data": [{ "id", "name", "slug", "role", "memberCount", "createdAt" }] }` |

### GET `/workspaces/:workspaceId`

| | |
|--|--|
| **Auth** | Workspace member |
| **Response 200** | `{ "id", "name", "slug", "description", "memberCount", "createdAt", "members": [...] }` |

### PATCH `/workspaces/:workspaceId`

| | |
|--|--|
| **Auth** | Workspace Owner |
| **Body** | `{ "name?": "string", "description?": "string" }` |
| **Response 200** | Updated workspace |

### DELETE `/workspaces/:workspaceId`

| | |
|--|--|
| **Auth** | Workspace Owner |
| **Response 204** | Soft delete |

### POST `/workspaces/:workspaceId/invitations`

| | |
|--|--|
| **Auth** | Workspace Owner |
| **Body** | `{ "email": "string", "role": "MEMBER" }` |
| **Validation** | email valid; role: MEMBER (default) |
| **Response 201** | `{ "id", "email", "role", "expiresAt", "createdAt" }` |

### GET `/workspaces/:workspaceId/invitations`

| | |
|--|--|
| **Auth** | Workspace Owner |
| **Response 200** | `{ "data": [{ "id", "email", "role", "expiresAt", "createdAt" }] }` |

### POST `/invitations/:token/accept`

| | |
|--|--|
| **Auth** | Required |
| **Response 200** | `{ "workspace": { "id", "name", "slug" }, "role": "MEMBER" }` |
| **Errors** | 404 invalid token, 410 expired token |

### GET `/workspaces/:workspaceId/members`

| | |
|--|--|
| **Auth** | Workspace member |
| **Response 200** | `{ "data": [{ "userId", "displayName", "email", "avatarUrl", "role", "joinedAt" }] }` |

### PATCH `/workspaces/:workspaceId/members/:userId`

| | |
|--|--|
| **Auth** | Workspace Owner |
| **Body** | `{ "role": "MEMBER" | "OWNER" }` |
| **Response 200** | Updated member |

### DELETE `/workspaces/:workspaceId/members/:userId`

| | |
|--|--|
| **Auth** | Workspace Owner |
| **Response 204** | Member removed |

---

## 4. Meetings

> **Status:** Implemented (v1.0) — CRUD, paginated list with filters, transcript upload, reprocess trigger. AI worker processes transcripts asynchronously (BullMQ + Redis) or synchronously when `AI_USE_MOCK=true` / no Redis.

### POST `/workspaces/:workspaceId/meetings`

| | |
|--|--|
| **Auth** | Workspace member |
| **Body** | `{ "title", "meetingDate", "durationMinutes?", "attendees?", "tags?" }` |
| **Validation** | title: 1–200 chars; meetingDate: ISO 8601 |
| **Response 201** | Full meeting object |

**Response body example:**
```json
{
  "id": "uuid",
  "workspaceId": "uuid",
  "title": "Sprint Planning",
  "meetingDate": "2026-06-15T10:00:00.000Z",
  "durationMinutes": 60,
  "attendees": ["Alex", "Jordan"],
  "tags": ["sprint", "planning"],
  "status": "DRAFT",
  "createdById": "uuid",
  "createdAt": "2026-06-15T11:00:00.000Z"
}
```

### GET `/workspaces/:workspaceId/meetings`

| | |
|--|--|
| **Auth** | Workspace member |
| **Query** | `page`, `limit`, `status`, `from`, `to`, `tag`, `search` |
| **Response 200** | Paginated meeting list |

### GET `/workspaces/:workspaceId/meetings/:meetingId`

| | |
|--|--|
| **Auth** | Workspace member |
| **Response 200** | Meeting + transcript + aiOutput + actionItems + linkedTasks |

### PATCH `/workspaces/:workspaceId/meetings/:meetingId`

| | |
|--|--|
| **Auth** | Workspace member |
| **Body** | Partial meeting fields |
| **Response 200** | Updated meeting |

### DELETE `/workspaces/:workspaceId/meetings/:meetingId`

| | |
|--|--|
| **Auth** | Creator or Owner |
| **Response 204** | Soft delete |

### PUT `/workspaces/:workspaceId/meetings/:meetingId/transcript`

| | |
|--|--|
| **Auth** | Workspace member |
| **Body** | `{ "content": "string", "sourceFormat": "text|md|vtt|srt" }` |
| **Validation** | content: 100 chars min, 5MB max |
| **Response 200** | `{ "meetingId", "status": "PROCESSING", "charCount" }` |

### POST `/workspaces/:workspaceId/meetings/:meetingId/reprocess`

| | |
|--|--|
| **Auth** | Workspace member |
| **Response 202** | `{ "status": "PROCESSING" }` |
| **Errors** | 400 no transcript |

---

## 5. AI Outputs

> **Status:** Implemented (v1.0) — BullMQ worker with sync/mock fallback for tests; OpenAI structured JSON output; AI output CRUD, action-item accept/reject → tasks. Chat endpoints deferred (MVP+1). Run worker via `npm run worker` when `REDIS_URL` is set.

### GET `/workspaces/:workspaceId/meetings/:meetingId/ai-output`

| | |
|--|--|
| **Auth** | Workspace member |
| **Response 200** | See example below |

```json
{
  "summary": "The team discussed sprint goals...",
  "decisions": [
    { "text": "Launch date set to July 1", "context": "..." }
  ],
  "risks": [
    { "text": "API dependency may slip", "severity": "high", "context": "..." }
  ],
  "processingStatus": "COMPLETED",
  "processedAt": "2026-06-15T11:05:00.000Z",
  "modelVersion": "gpt-4o"
}
```

### PATCH `/workspaces/:workspaceId/meetings/:meetingId/ai-output`

| | |
|--|--|
| **Auth** | Workspace member |
| **Body** | `{ "summary?": "string", "decisions?": [...], "risks?": [...] }` |
| **Response 200** | Updated AI output |

### GET `/workspaces/:workspaceId/meetings/:meetingId/action-items`

| | |
|--|--|
| **Auth** | Workspace member |
| **Response 200** | `{ "data": [ActionItemSuggestion] }` |

### POST `/workspaces/:workspaceId/meetings/:meetingId/action-items/accept`

| | |
|--|--|
| **Auth** | Workspace member |
| **Body** | `{ "actionItemIds": ["uuid"], "overrides?": [{ "id", "assigneeId", "dueDate", "title" }] }` |
| **Response 201** | `{ "tasks": [Task] }` |

### POST `/workspaces/:workspaceId/meetings/:meetingId/action-items/reject`

| | |
|--|--|
| **Auth** | Workspace member |
| **Body** | `{ "actionItemIds": ["uuid"] }` |
| **Response 200** | `{ "rejected": 3 }` |

### POST `/workspaces/:workspaceId/meetings/:meetingId/chat`

| | |
|--|--|
| **Auth** | Workspace member |
| **Body** | `{ "message": "string" }` |
| **Validation** | message: 1–4000 chars |
| **Response 200** | SSE stream or `{ "reply": "string", "messageId": "uuid" }` |

### GET `/workspaces/:workspaceId/meetings/:meetingId/chat`

| | |
|--|--|
| **Auth** | Workspace member |
| **Response 200** | `{ "data": [{ "id", "role", "content", "createdAt" }] }` |

---

## 6. Tasks

> **Status:** Implemented (v1.0) — CRUD, paginated list with filters, Kanban board, comments with @mention notifications, status history logging, soft delete (creator or owner). Task assignment triggers in-app `TASK_ASSIGNED` notifications.

### POST `/workspaces/:workspaceId/tasks`

| | |
|--|--|
| **Auth** | Workspace member |
| **Body** | `{ "title", "description?", "assigneeId?", "dueDate?", "priority?", "meetingId?" }` |
| **Validation** | title: 1–300 chars; priority: LOW|MEDIUM|HIGH |
| **Response 201** | Task object |

### GET `/workspaces/:workspaceId/tasks`

| | |
|--|--|
| **Auth** | Workspace member |
| **Query** | `status`, `assigneeId`, `priority`, `page`, `limit`, `search` |
| **Response 200** | Paginated tasks |

### GET `/workspaces/:workspaceId/tasks/board`

| | |
|--|--|
| **Auth** | Workspace member |
| **Query** | `assigneeId?` |
| **Response 200** | `{ "TODO": [...], "IN_PROGRESS": [...], "DONE": [...] }` |

### GET `/workspaces/:workspaceId/tasks/:taskId`

| | |
|--|--|
| **Auth** | Workspace member |
| **Response 200** | Task with meeting link, assignee, comments count |

### PATCH `/workspaces/:workspaceId/tasks/:taskId`

| | |
|--|--|
| **Auth** | Workspace member |
| **Body** | `{ "title?", "description?", "status?", "assigneeId?", "dueDate?", "priority?" }` |
| **Response 200** | Updated task; sets `completedAt` when status → DONE |

### DELETE `/workspaces/:workspaceId/tasks/:taskId`

| | |
|--|--|
| **Auth** | Creator or Owner |
| **Response 204** | Soft delete |

### POST `/workspaces/:workspaceId/tasks/:taskId/comments`

| | |
|--|--|
| **Auth** | Workspace member |
| **Body** | `{ "content": "string" }` |
| **Validation** | content: 1–5000 chars |
| **Response 201** | Comment object; triggers mention notifications |

### GET `/workspaces/:workspaceId/tasks/:taskId/comments`

| | |
|--|--|
| **Auth** | Workspace member |
| **Response 200** | `{ "data": [{ "id", "content", "author": {...}, "createdAt" }] }` |

---

## 7. Dashboard & Search

> **Status:** Implemented (v1.0) — workspace dashboard with stats, weekly productivity chart, avg completion time, and recent activity feed. Search across meetings (title, tags), tasks (title, description, assignee, status), and AI summary snippets with `type` filter and pagination.

### GET `/workspaces/:workspaceId/dashboard`

| | |
|--|--|
| **Auth** | Workspace member |
| **Response 200** | See example below |

```json
{
  "stats": {
    "totalMeetings": 24,
    "openTasks": 18,
    "overdueTasks": 3,
    "completedThisWeek": 12
  },
  "productivity": {
    "tasksCompletedPerWeek": [
      { "week": "2026-W23", "count": 12 },
      { "week": "2026-W24", "count": 15 }
    ],
    "avgDaysToComplete": 4.2
  },
  "recentActivity": [
    {
      "id": "uuid",
      "action": "TASK_COMPLETED",
      "actor": { "displayName": "Alex" },
      "entityType": "task",
      "entityId": "uuid",
      "metadata": { "title": "Update API docs" },
      "createdAt": "2026-06-15T10:00:00.000Z"
    }
  ]
}
```

### GET `/workspaces/:workspaceId/search`

| | |
|--|--|
| **Auth** | Workspace member |
| **Query** | `q` (required), `type` (meetings|tasks|all), `page`, `limit` |
| **Response 200** | `{ "meetings": [...], "tasks": [...], "snippets": [...] }` |

---

## 8. Notifications

> **Status:** Implemented (v1.0) — list (paginated, `unreadOnly` filter), mark single read, mark all read. Created automatically on task assignment and @mentions. Preferences at `GET/PATCH /users/me/notification-preferences`.

### GET `/notifications`

| | |
|--|--|
| **Auth** | Required |
| **Query** | `unreadOnly`, `page`, `limit` |
| **Response 200** | Paginated notifications |

### PATCH `/notifications/:id/read`

| | |
|--|--|
| **Auth** | Required (own notification) |
| **Response 200** | `{ "id", "isRead": true }` |

### POST `/notifications/read-all`

| | |
|--|--|
| **Auth** | Required |
| **Response 200** | `{ "markedRead": 5 }` |

### GET `/users/me/notification-preferences`

| | |
|--|--|
| **Auth** | Required |
| **Response 200** | `{ "emailTaskAssigned", "emailDueSoon", "inAppMentions" }` |

### PATCH `/users/me/notification-preferences`

| | |
|--|--|
| **Auth** | Required |
| **Body** | Partial preferences object |
| **Response 200** | Updated preferences |

---

## 9. Health

### GET `/health`

| | |
|--|--|
| **Auth** | None |
| **Response 200** | `{ "status": "ok", "db": "ok", "version": "1.0.0" }` |
| **Response 503** | `{ "status": "degraded", "db": "error" }` |

---

## 10. Rate Limits

| Endpoint Group | Limit |
|----------------|-------|
| `/auth/login`, `/auth/register` | 10 req/min per IP |
| `/auth/forgot-password` | 5 req/hour per email |
| AI processing trigger | 20 req/hour per workspace |
| General API | 100 req/min per user |

---

## 11. Webhooks (Future)

Planned events for v2:
- `meeting.processed`
- `task.created`
- `task.completed`

Payload format: JSON with `event`, `timestamp`, `data`, `workspaceId`.
