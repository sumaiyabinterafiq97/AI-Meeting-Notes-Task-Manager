# Database Design

**Product:** AI Meeting Notes & Task Manager  
**Version:** 1.1  
**Database:** PostgreSQL 16 (Neon)

> **Canonical references:** [database-architecture.md](./database-architecture.md) · [erd.md](./erd.md)  
> This document is the original design. The architecture review added `ai_processing_jobs`, `notification_preferences`, `search_vector`, and `position` on tasks.

---

## 1. Design Principles

- **UUID primary keys** for safe distributed ID generation
- **TIMESTAMPTZ** for all timestamps (UTC storage)
- **Soft deletes** on core entities (`deleted_at`)
- **Workspace scoping** on all tenant data
- **JSONB** for flexible AI structures with GIN indexes where queried
- **Partial indexes** for active records: `WHERE deleted_at IS NULL`

---

## 2. Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ WorkspaceMember : belongs_to
    User ||--o{ RefreshToken : has
    User ||--o{ PasswordResetToken : has
    User ||--o{ Notification : receives
    User ||--o{ TaskComment : writes
    User ||--o{ MeetingChatMessage : sends

    Workspace ||--o{ WorkspaceMember : has
    Workspace ||--o{ WorkspaceInvitation : has
    Workspace ||--o{ Meeting : contains
    Workspace ||--o{ Task : contains
    Workspace ||--o{ ActivityLog : logs

    Meeting ||--o| MeetingTranscript : has
    Meeting ||--o| MeetingAIOutput : has
    Meeting ||--o{ ActionItemSuggestion : suggests
    Meeting ||--o{ MeetingChatMessage : has
    Meeting ||--o{ Task : sources

    Task ||--o{ TaskComment : has
    Task ||--o{ TaskStatusHistory : tracks
    ActionItemSuggestion ||--o| Task : becomes

    User {
        uuid id PK
        string email UK
        string passwordHash
        string displayName
        string avatarUrl
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    Workspace {
        uuid id PK
        string name
        string slug UK
        string description
        uuid createdById FK
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    WorkspaceMember {
        uuid id PK
        uuid workspaceId FK
        uuid userId FK
        enum role
        datetime joinedAt
    }

    Meeting {
        uuid id PK
        uuid workspaceId FK
        uuid createdById FK
        string title
        datetime meetingDate
        int durationMinutes
        json attendees
        string[] tags
        enum status
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    MeetingTranscript {
        uuid id PK
        uuid meetingId FK UK
        text content
        string sourceFormat
        int charCount
        datetime uploadedAt
    }

    MeetingAIOutput {
        uuid id PK
        uuid meetingId FK UK
        text summary
        json decisions
        json risks
        json rawResponse
        enum processingStatus
        datetime processedAt
        string modelVersion
    }

    ActionItemSuggestion {
        uuid id PK
        uuid meetingId FK
        string title
        text description
        uuid suggestedAssigneeId FK
        date suggestedDueDate
        enum status
        datetime createdAt
    }

    Task {
        uuid id PK
        uuid workspaceId FK
        uuid meetingId FK
        uuid actionItemId FK
        uuid createdById FK
        uuid assigneeId FK
        string title
        text description
        enum status
        enum priority
        date dueDate
        datetime completedAt
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    TaskComment {
        uuid id PK
        uuid taskId FK
        uuid authorId FK
        text content
        datetime createdAt
        datetime updatedAt
    }

    Notification {
        uuid id PK
        uuid userId FK
        uuid workspaceId FK
        enum type
        json payload
        boolean isRead
        datetime createdAt
    }
```

---

## 3. Tables

### 3.1 `users`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| email | VARCHAR(255) | NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| display_name | VARCHAR(100) | NOT NULL |
| avatar_url | TEXT | NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL |
| deleted_at | TIMESTAMPTZ | NULL |

**Indexes:**
- `users_email_active_idx` UNIQUE ON (email) WHERE deleted_at IS NULL

---

### 3.2 `workspaces`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(100) | NOT NULL |
| slug | VARCHAR(120) | NOT NULL, UNIQUE |
| description | TEXT | NULL |
| created_by_id | UUID | FK → users(id) |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |
| deleted_at | TIMESTAMPTZ | NULL |

**Indexes:**
- `workspaces_slug_idx` UNIQUE ON (slug)
- `idx_workspaces_created_by` ON (created_by_id)

---

### 3.3 `workspace_members`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| workspace_id | UUID | FK → workspaces(id) ON DELETE CASCADE |
| user_id | UUID | FK → users(id) ON DELETE CASCADE |
| role | workspace_role | NOT NULL |
| joined_at | TIMESTAMPTZ | DEFAULT now() |

**Enum `workspace_role`:** `OWNER`, `MEMBER`

**Indexes:**
- `workspace_members_workspace_user_idx` UNIQUE ON (workspace_id, user_id)
- `idx_wm_user_id` ON (user_id)

---

### 3.4 `workspace_invitations`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| workspace_id | UUID | FK → workspaces(id) ON DELETE CASCADE |
| email | VARCHAR(255) | NOT NULL |
| role | workspace_role | DEFAULT 'MEMBER' |
| token | VARCHAR(255) | NOT NULL, UNIQUE |
| invited_by_id | UUID | FK → users(id) |
| expires_at | TIMESTAMPTZ | NOT NULL |
| accepted_at | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | NOT NULL |

**Indexes:**
- `workspace_invitations_token_idx` UNIQUE ON (token)
- `idx_invitations_workspace_email` ON (workspace_id, email) WHERE accepted_at IS NULL

---

### 3.5 `meetings`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| workspace_id | UUID | FK → workspaces(id), NOT NULL |
| created_by_id | UUID | FK → users(id) |
| title | VARCHAR(200) | NOT NULL |
| meeting_date | TIMESTAMPTZ | NOT NULL |
| duration_minutes | INT | NULL |
| attendees | JSONB | DEFAULT '[]' |
| tags | TEXT[] | DEFAULT '{}' |
| status | meeting_status | NOT NULL, DEFAULT 'DRAFT' |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |
| deleted_at | TIMESTAMPTZ | NULL |

**Enum `meeting_status`:** `DRAFT`, `PROCESSING`, `READY`, `FAILED`

**Indexes:**
- `idx_meetings_workspace_date` ON (workspace_id, meeting_date DESC) WHERE deleted_at IS NULL
- `idx_meetings_status` ON (workspace_id, status)
- `idx_meetings_tags` GIN ON (tags)

---

### 3.6 `meeting_transcripts`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| meeting_id | UUID | FK → meetings(id) ON DELETE CASCADE, UNIQUE |
| content | TEXT | NOT NULL |
| source_format | VARCHAR(20) | DEFAULT 'text' |
| char_count | INT | NOT NULL |
| uploaded_at | TIMESTAMPTZ | NOT NULL |

**Indexes:**
- `idx_transcripts_fts` GIN ON (to_tsvector('english', content))

---

### 3.7 `meeting_ai_outputs`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| meeting_id | UUID | FK → meetings(id) ON DELETE CASCADE, UNIQUE |
| summary | TEXT | NULL |
| decisions | JSONB | DEFAULT '[]' |
| risks | JSONB | DEFAULT '[]' |
| raw_response | JSONB | NULL |
| processing_status | ai_processing_status | NOT NULL |
| error_message | TEXT | NULL |
| processed_at | TIMESTAMPTZ | NULL |
| model_version | VARCHAR(50) | NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

**Enum `ai_processing_status`:** `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`

**Indexes:**
- `idx_ai_outputs_summary_fts` GIN ON (to_tsvector('english', coalesce(summary, '')))

**JSONB `decisions` shape:**
```json
[{ "text": "string", "context": "string", "owner": "string|null" }]
```

**JSONB `risks` shape:**
```json
[{ "text": "string", "severity": "low|medium|high", "context": "string" }]
```

---

### 3.8 `action_item_suggestions`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| meeting_id | UUID | FK → meetings(id) ON DELETE CASCADE |
| title | VARCHAR(300) | NOT NULL |
| description | TEXT | NULL |
| suggested_assignee_id | UUID | FK → users(id), NULL |
| suggested_due_date | DATE | NULL |
| status | action_item_status | DEFAULT 'PENDING' |
| created_at | TIMESTAMPTZ | NOT NULL |

**Enum `action_item_status`:** `PENDING`, `ACCEPTED`, `REJECTED`

**Indexes:**
- `idx_action_items_meeting` ON (meeting_id, status)

---

### 3.9 `tasks`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| workspace_id | UUID | FK → workspaces(id), NOT NULL |
| meeting_id | UUID | FK → meetings(id) ON DELETE SET NULL, NULL |
| action_item_id | UUID | FK → action_item_suggestions(id), NULL, UNIQUE |
| created_by_id | UUID | FK → users(id) |
| assignee_id | UUID | FK → users(id), NULL |
| title | VARCHAR(300) | NOT NULL |
| description | TEXT | NULL |
| status | task_status | DEFAULT 'TODO' |
| priority | task_priority | DEFAULT 'MEDIUM' |
| due_date | DATE | NULL |
| completed_at | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |
| deleted_at | TIMESTAMPTZ | NULL |

**Enum `task_status`:** `TODO`, `IN_PROGRESS`, `DONE`  
**Enum `task_priority`:** `LOW`, `MEDIUM`, `HIGH`

**Indexes:**
- `idx_tasks_workspace_status` ON (workspace_id, status) WHERE deleted_at IS NULL
- `idx_tasks_assignee` ON (assignee_id, status) WHERE deleted_at IS NULL
- `idx_tasks_due_date` ON (workspace_id, due_date) WHERE deleted_at IS NULL AND status != 'DONE'
- `idx_tasks_meeting` ON (meeting_id)

---

### 3.10 `task_comments`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| task_id | UUID | FK → tasks(id) ON DELETE CASCADE |
| author_id | UUID | FK → users(id) |
| content | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

**Indexes:**
- `idx_task_comments_task` ON (task_id, created_at)

---

### 3.11 `task_status_history`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| task_id | UUID | FK → tasks(id) ON DELETE CASCADE |
| from_status | task_status | NULL |
| to_status | task_status | NOT NULL |
| changed_by_id | UUID | FK → users(id) |
| changed_at | TIMESTAMPTZ | NOT NULL |

**Indexes:**
- `idx_task_history_task` ON (task_id, changed_at DESC)

---

### 3.12 `meeting_chat_messages`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| meeting_id | UUID | FK → meetings(id) ON DELETE CASCADE |
| user_id | UUID | FK → users(id) |
| role | chat_role | NOT NULL |
| content | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |

**Enum `chat_role`:** `USER`, `ASSISTANT`

**Indexes:**
- `idx_chat_messages_meeting` ON (meeting_id, created_at)

---

### 3.13 `notifications`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users(id) ON DELETE CASCADE |
| workspace_id | UUID | FK → workspaces(id) ON DELETE CASCADE, NULL |
| type | notification_type | NOT NULL |
| payload | JSONB | NOT NULL |
| is_read | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMPTZ | NOT NULL |

**Enum `notification_type`:** `TASK_ASSIGNED`, `TASK_MENTION`, `TASK_DUE_SOON`, `TASK_OVERDUE`, `INVITATION`

**Indexes:**
- `idx_notifications_user_unread` ON (user_id, created_at DESC) WHERE is_read = false

---

### 3.14 `activity_logs`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| workspace_id | UUID | FK → workspaces(id) ON DELETE CASCADE |
| actor_id | UUID | FK → users(id) |
| action | VARCHAR(50) | NOT NULL |
| entity_type | VARCHAR(50) | NOT NULL |
| entity_id | UUID | NOT NULL |
| metadata | JSONB | DEFAULT '{}' |
| created_at | TIMESTAMPTZ | NOT NULL |

**Indexes:**
- `idx_activity_workspace` ON (workspace_id, created_at DESC)

---

### 3.15 Auth Tables

#### `refresh_tokens`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users(id) ON DELETE CASCADE |
| token_hash | VARCHAR(255) | NOT NULL, UNIQUE |
| expires_at | TIMESTAMPTZ | NOT NULL |
| revoked_at | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | NOT NULL |

#### `password_reset_tokens`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → users(id) ON DELETE CASCADE |
| token_hash | VARCHAR(255) | NOT NULL, UNIQUE |
| expires_at | TIMESTAMPTZ | NOT NULL |
| used_at | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | NOT NULL |

---

## 4. Relationships Summary

| Parent | Child | Relationship | On Delete |
|--------|-------|--------------|-----------|
| users | workspace_members | 1:N | CASCADE |
| workspaces | workspace_members | 1:N | CASCADE |
| workspaces | meetings | 1:N | RESTRICT |
| meetings | meeting_transcripts | 1:1 | CASCADE |
| meetings | meeting_ai_outputs | 1:1 | CASCADE |
| meetings | action_item_suggestions | 1:N | CASCADE |
| meetings | tasks | 1:N | SET NULL |
| action_item_suggestions | tasks | 1:1 | SET NULL |
| tasks | task_comments | 1:N | CASCADE |
| tasks | task_status_history | 1:N | CASCADE |
| users | notifications | 1:N | CASCADE |

---

## 5. PostgreSQL Extensions & Configuration

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy title search
```

### Neon Recommendations

- Use **pooled connection string** for application runtime
- Use **direct connection** for `prisma migrate` only
- Enable **autoscaling** for dev; fixed compute for production baseline
- Configure **point-in-time recovery** for production

### Full-Text Search Example

```sql
SELECT m.id, m.title,
       ts_rank(to_tsvector('english', t.content), plainto_tsquery('english', $1)) AS rank
FROM meetings m
JOIN meeting_transcripts t ON t.meeting_id = m.id
WHERE m.workspace_id = $2
  AND m.deleted_at IS NULL
  AND to_tsvector('english', t.content) @@ plainto_tsquery('english', $1)
ORDER BY rank DESC
LIMIT 20;
```

---

## 6. Migration Strategy

1. Initial migration: all core tables + enums
2. Seed script: demo user, workspace, sample meeting (dev only)
3. All schema changes via Prisma migrations — no manual prod edits
4. Backward-compatible migrations preferred (add column → deploy → backfill → enforce)
