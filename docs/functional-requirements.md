# Functional Requirements

**Product:** AI Meeting Notes & Task Manager  
**Version:** 1.1  
**Status:** Approved for Implementation  
**Related:** [non-functional-requirements.md](./non-functional-requirements.md) · [user-stories.md](./user-stories.md)

---

## Status Enum Reference (Canonical)

| Entity | Field | Values |
|--------|-------|--------|
| Meeting | `status` | `DRAFT`, `PROCESSING`, `READY`, `FAILED` |
| AI Output | `processing_status` | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` |
| Action Item | `status` | `PENDING`, `ACCEPTED`, `REJECTED` |
| Task | `status` | `TODO`, `IN_PROGRESS`, `DONE` |

**Rule:** `meetings.status` is the user-facing state. When `meeting_ai_outputs.processing_status = COMPLETED`, set `meetings.status = READY`. On failure, both reflect `FAILED`.

---

## 1. Authentication

### Register
- **FR-AUTH-001:** System shall allow registration with email, password, and display name.
- **FR-AUTH-002:** Password minimum: 8 characters, at least one letter and one number.
- **FR-AUTH-003:** Email must be unique; return generic error on duplicate to prevent enumeration.
- **FR-AUTH-004:** Passwords stored with bcrypt (cost factor ≥ 12).
- **FR-AUTH-005:** On success, return access JWT (15 min) and refresh token (7 days, httpOnly cookie).
- **FR-AUTH-018:** Email normalized to lowercase before storage and lookup.

### Login
- **FR-AUTH-006:** Authenticate via email + password.
- **FR-AUTH-007:** Rate limit: 5 failed attempts per 15 min per IP **and** per email; lockout message generic.
- **FR-AUTH-008:** Return user profile + tokens on success.
- **FR-AUTH-019:** Revoke all refresh tokens on password change (optional: configurable).

### Logout
- **FR-AUTH-009:** Invalidate refresh token server-side via DB revocation.
- **FR-AUTH-010:** Clear client-side auth state; never persist access token in localStorage.

### JWT Authentication
- **FR-AUTH-011:** Access token in `Authorization: Bearer` header.
- **FR-AUTH-012:** Refresh endpoint issues new access token and **rotates** refresh token.
- **FR-AUTH-013:** JWT payload: `sub` (userId), `email`, `iat`, `exp`, `jti` (token ID).
- **FR-AUTH-014:** All protected routes validate JWT middleware.
- **FR-AUTH-020:** Reject tokens for soft-deleted users.

### Password Reset
- **FR-AUTH-015:** Request reset sends time-limited token (1 hour) via email.
- **FR-AUTH-016:** Reset link single-use; invalidates on password change.
- **FR-AUTH-017:** New password must meet registration rules.

### Profile
- **FR-AUTH-021:** User can view and update display name; avatar URL (MVP+1: file upload).

---

## 2. Workspace Management

### Create Workspace
- **FR-WS-001:** Authenticated user can create workspace with name (3–100 chars) and optional description.
- **FR-WS-002:** Creator becomes Workspace Owner automatically.
- **FR-WS-003:** Slug auto-generated from name; unique per system; URL-safe.
- **FR-WS-010:** Limit: 10 workspaces per user (MVP); configurable.

### Invite Members
- **FR-WS-004:** Owner can invite by email; generates invitation token (expires 7 days).
- **FR-WS-005:** Invitee with existing account joins on accept; new users register then accept.
- **FR-WS-006:** Pending invitations list visible to Owner.
- **FR-WS-011:** Prevent duplicate pending invite for same email in same workspace.
- **FR-WS-012:** Invited user must match invitation email on accept.

### Roles & Permissions
- **FR-WS-007:** Roles: `OWNER`, `MEMBER` (MVP).
- **FR-WS-008:** Owner can change member role, remove members, delete workspace.
- **FR-WS-009:** Member can create/edit meetings and tasks; cannot manage workspace or members.
- **FR-WS-013:** Workspace must always have ≥ 1 Owner; cannot remove or demote last Owner.
- **FR-WS-014:** Transfer ownership: promote another member to Owner before demotion (MVP+1).

### Member Validation
- **FR-WS-015:** Task assignee must be active workspace member.
- **FR-WS-016:** Removed member retains historical attribution but loses access immediately.

---

## 3. Meeting Management

### Create Meeting
- **FR-MTG-001:** Fields: title (required), date/time, duration (optional), attendees (JSON array), tags.
- **FR-MTG-002:** Meeting scoped to single workspace.
- **FR-MTG-003:** Creator recorded as `created_by_id`.

### Edit Meeting
- **FR-MTG-004:** Any workspace member can update metadata (MVP policy).
- **FR-MTG-005:** Transcript replacement triggers re-processing; previous AI output archived or overwritten with version note.

### Delete Meeting
- **FR-MTG-006:** Owner or creator can soft-delete meeting.
- **FR-MTG-007:** Associated tasks remain; `meeting_id` set null; UI shows "source meeting deleted."
- **FR-MTG-014:** Only Owner can delete meetings they did not create (override).

### Upload Transcript
- **FR-MTG-008:** Accept `.txt`, `.md`, `.vtt`, `.srt` up to 5 MB; paste plain text.
- **FR-MTG-009:** Store raw transcript; enqueue AI processing job with idempotency key.
- **FR-MTG-010:** Validate minimum transcript length (100 characters).
- **FR-MTG-015:** Strip/normalize uploaded file encoding to UTF-8.
- **FR-MTG-016:** Reject concurrent processing jobs for same meeting (return 409 if PROCESSING).

### Meeting History
- **FR-MTG-011:** Paginated list sorted by `meeting_date` DESC.
- **FR-MTG-012:** Filter by date range, tag, status.
- **FR-MTG-013:** Detail view: transcript, AI outputs, action items, linked tasks.

---

## 4. AI Features

### Meeting Summary
- **FR-AI-001:** Generate structured summary: overview, topics, outcomes.
- **FR-AI-002:** Store raw AI response + parsed structured JSON.
- **FR-AI-003:** User can edit and save final summary.

### Key Decisions
- **FR-AI-004:** Extract decisions with context snippet.
- **FR-AI-005:** Each decision: text, optional owner, optional transcript reference.

### Action Item Extraction
- **FR-AI-006:** Extract title, description, suggested assignee, suggested due date.
- **FR-AI-007:** User reviews; bulk accept/reject before task creation.
- **FR-AI-013:** Idempotent task creation: same `action_item_id` cannot create duplicate tasks.

### Risk Detection
- **FR-AI-008:** Extract risks with severity (low/medium/high).
- **FR-AI-009:** Display in meeting detail; conversion to task in MVP+1.

### AI Chat Assistant (MVP+1)
- **FR-AI-010:** Per-meeting chat with transcript + AI output as context.
- **FR-AI-011:** Stream responses via SSE.
- **FR-AI-012:** Chat history persisted per meeting (shared thread, not per-user).

### AI Operations
- **FR-AI-014:** Job retries: 3 attempts, exponential backoff (2s, 4s, 8s).
- **FR-AI-015:** Log model version, token usage, and latency per job.
- **FR-AI-016:** Chunk transcripts > 80k tokens; merge results.
- **FR-AI-017:** Do not send user passwords or unrelated PII to OpenAI.

---

## 5. Task Management

### Automatic Task Creation
- **FR-TASK-001:** On accept, create task from action item fields.
- **FR-TASK-002:** Link `meeting_id` and `action_item_id` (unique constraint).
- **FR-TASK-012:** Accept endpoint supports `Idempotency-Key` header.

### Task Assignment
- **FR-TASK-003:** Assign to workspace member; notify assignee.
- **FR-TASK-004:** Reassignment by creator, current assignee, or Owner.

### Kanban Board
- **FR-TASK-005:** Columns: `TODO`, `IN_PROGRESS`, `DONE`.
- **FR-TASK-006:** Status update via PATCH; drag-and-drop with optimistic UI (MVP+1 polish).
- **FR-TASK-013:** Board endpoint: paginate `DONE` column (default 50); unbounded for TODO/IN_PROGRESS with 500 task workspace limit.

### Task Status Tracking
- **FR-TASK-007:** Status transitions logged in `task_status_history`.
- **FR-TASK-008:** `completed_at` set when status → DONE; cleared if reopened.
- **FR-TASK-014:** Overdue: `due_date < today AND status != DONE`.

### Comments
- **FR-TASK-009:** Flat comments (MVP).
- **FR-TASK-010:** @mention triggers notification to workspace members only.
- **FR-TASK-011:** Edit/delete own comments within 15 minutes.

### Delete
- **FR-TASK-015:** Creator or Owner can delete task (soft delete).

---

## 6. Notifications

- **FR-NOTIF-001:** In-app notification on task assignment.
- **FR-NOTIF-002:** In-app notification on @mention.
- **FR-NOTIF-003:** Mark read / mark all read.
- **FR-NOTIF-004:** Email notifications (MVP+1).
- **FR-NOTIF-005:** User notification preferences (MVP+1).
- **FR-NOTIF-006:** Notification payload includes deep link path.

---

## 7. Dashboard

- **FR-DASH-001:** Stats: total meetings, open tasks, overdue tasks, completed this week.
- **FR-DASH-002:** Tasks completed per week chart (MVP+1).
- **FR-DASH-003:** Avg days to completion (MVP+1).
- **FR-DASH-004:** Activity feed: last 30 days, paginated, max 50 per page.
- **FR-DASH-005:** Stats computed via aggregated queries or materialized counters (not full table scans).

---

## 8. Search

- **FR-SRCH-001:** Search meetings by title, tags (MVP).
- **FR-SRCH-002:** Paginated results with workspace scope.
- **FR-SRCH-003:** Search tasks by title, assignee, status.
- **FR-SRCH-004:** Full-text search on summaries/transcripts (MVP+1).
- **FR-SRCH-005:** Minimum query length: 2 characters.

---

## 9. Activity Logging

- **FR-ACT-001:** Log: meeting created/deleted, task created/completed, member added/removed.
- **FR-ACT-002:** Activity entries immutable; no user delete.
- **FR-ACT-003:** Actor, entity type, entity ID, metadata JSON.

---

## Traceability Matrix

| Module | Requirement IDs | Primary Stories |
|--------|-----------------|-----------------|
| Auth | FR-AUTH-* | AUTH-01 – AUTH-07 |
| Workspace | FR-WS-* | WS-01 – WS-07 |
| Meeting | FR-MTG-* | MTG-01 – MTG-07 |
| AI | FR-AI-* | AI-01 – AI-07 |
| Task | FR-TASK-* | TASK-01 – TASK-08 |
| Notifications | FR-NOTIF-* | NOTIF-01 – NOTIF-05 |
| Dashboard | FR-DASH-* | ANLYT-01 – ANLYT-04 |
| Search | FR-SRCH-* | SRCH-01 – SRCH-04 |
