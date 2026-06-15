# Entity Relationship Diagram

**Product:** AI Meeting Notes & Task Manager  
**Version:** 1.0  
**Database:** PostgreSQL 16 (Neon)

---

## Complete ERD (Mermaid)

```mermaid
erDiagram
    users ||--o{ workspace_members : "belongs to"
    users ||--o{ refresh_tokens : "has"
    users ||--o{ password_reset_tokens : "has"
    users ||--o| notification_preferences : "has"
    users ||--o{ notifications : "receives"
    users ||--o{ task_comments : "writes"
    users ||--o{ meeting_chat_messages : "sends"
    users ||--o{ tasks : "creates"
    users ||--o{ tasks : "assigned"
    users ||--o{ activity_logs : "performs"

    workspaces ||--o{ workspace_members : "has"
    workspaces ||--o{ workspace_invitations : "has"
    workspaces ||--o{ meetings : "contains"
    workspaces ||--o{ tasks : "contains"
    workspaces ||--o{ activity_logs : "logs"
    workspaces ||--o{ ai_processing_jobs : "scopes"
    workspaces ||--o{ notifications : "scopes"

    users ||--o{ workspaces : "creates"

    meetings ||--o| meeting_transcripts : "has"
    meetings ||--o| meeting_ai_outputs : "has"
    meetings ||--o{ action_item_suggestions : "suggests"
    meetings ||--o{ meeting_chat_messages : "has"
    meetings ||--o{ tasks : "sources"
    meetings ||--o{ ai_processing_jobs : "processes"

    action_item_suggestions ||--o| tasks : "becomes"

    tasks ||--o{ task_comments : "has"
    tasks ||--o{ task_status_history : "tracks"

    users {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar display_name
        text avatar_url
        timestamptz email_verified_at
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    workspaces {
        uuid id PK
        varchar name
        varchar slug UK
        text description
        uuid created_by_id FK
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    workspace_members {
        uuid id PK
        uuid workspace_id FK
        uuid user_id FK
        workspace_role role
        timestamptz joined_at
    }

    workspace_invitations {
        uuid id PK
        uuid workspace_id FK
        varchar email
        workspace_role role
        varchar token_hash UK
        uuid invited_by_id FK
        timestamptz expires_at
        timestamptz accepted_at
        timestamptz created_at
    }

    meetings {
        uuid id PK
        uuid workspace_id FK
        uuid created_by_id FK
        varchar title
        timestamptz meeting_date
        int duration_minutes
        jsonb attendees
        text_array tags
        text agenda
        meeting_status status
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    meeting_transcripts {
        uuid id PK
        uuid meeting_id FK_UK
        text content
        varchar source_format
        int char_count
        tsvector search_vector
        varchar storage_key
        timestamptz uploaded_at
    }

    meeting_ai_outputs {
        uuid id PK
        uuid meeting_id FK_UK
        text summary
        jsonb topics
        jsonb decisions
        jsonb risks
        jsonb raw_response
        ai_processing_status processing_status
        text error_message
        varchar model_version
        int prompt_tokens
        int completion_tokens
        timestamptz processed_at
        timestamptz created_at
        timestamptz updated_at
    }

    ai_processing_jobs {
        uuid id PK
        uuid meeting_id FK
        uuid workspace_id FK
        job_status status
        int attempt_count
        int max_attempts
        varchar idempotency_key UK
        varchar bull_job_id
        text error_message
        timestamptz started_at
        timestamptz completed_at
        timestamptz created_at
    }

    action_item_suggestions {
        uuid id PK
        uuid meeting_id FK
        varchar title
        text description
        uuid suggested_assignee_id FK
        date suggested_due_date
        action_item_status status
        timestamptz created_at
    }

    tasks {
        uuid id PK
        uuid workspace_id FK
        uuid meeting_id FK
        uuid action_item_id FK_UK
        uuid created_by_id FK
        uuid assignee_id FK
        varchar title
        text description
        task_status status
        task_priority priority
        date due_date
        int position
        timestamptz completed_at
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    task_comments {
        uuid id PK
        uuid task_id FK
        uuid author_id FK
        text content
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    task_status_history {
        uuid id PK
        uuid task_id FK
        task_status from_status
        task_status to_status
        uuid changed_by_id FK
        timestamptz changed_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        uuid workspace_id FK
        notification_type type
        jsonb payload
        boolean is_read
        timestamptz created_at
    }

    notification_preferences {
        uuid id PK
        uuid user_id FK_UK
        boolean email_task_assigned
        boolean email_due_soon
        boolean email_mentions
        boolean in_app_all
        timestamptz updated_at
    }

    activity_logs {
        uuid id PK
        uuid workspace_id FK
        uuid actor_id FK
        varchar action
        varchar entity_type
        uuid entity_id
        jsonb metadata
        timestamptz created_at
    }

    meeting_chat_messages {
        uuid id PK
        uuid meeting_id FK
        uuid user_id FK
        chat_role role
        text content
        timestamptz created_at
    }

    refresh_tokens {
        uuid id PK
        uuid user_id FK
        varchar token_hash UK
        timestamptz expires_at
        timestamptz revoked_at
        timestamptz created_at
    }

    password_reset_tokens {
        uuid id PK
        uuid user_id FK
        varchar token_hash UK
        timestamptz expires_at
        timestamptz used_at
        timestamptz created_at
    }
```

---

## Relationship Explanations

### Users & Workspaces (Many-to-Many)

A **user** can belong to multiple **workspaces** via `workspace_members`. Each membership has a `role` (`OWNER` or `MEMBER`). This is the core multi-tenancy junction — all workspace data access flows through this table.

### Workspaces & Meetings (One-to-Many)

Each **meeting** belongs to exactly one **workspace**. Meetings are soft-deleted (`deleted_at`). Workspace deletion soft-deletes all child meetings.

### Meetings & Transcripts (One-to-One)

Each meeting has at most one **transcript** (MVP). The transcript is stored separately due to large TEXT size. `search_vector` enables full-text search without runtime computation.

### Meetings & AI Outputs (One-to-One)

Each meeting has one **AI output** record containing summary, decisions (JSONB), and risks (JSONB). Created/updated by the AI worker after processing.

### Meetings & AI Processing Jobs (One-to-Many)

A meeting can have multiple **processing jobs** over its lifetime (re-processing). Jobs track status, retries, and idempotency. Only one job should be `PENDING` or `PROCESSING` at a time (enforced in service layer).

### Meetings & Action Item Suggestions (One-to-Many)

AI extracts zero or more **action item suggestions** per meeting. Each has a lifecycle: `PENDING` → `ACCEPTED` or `REJECTED`.

### Action Items & Tasks (One-to-One)

An accepted action item creates exactly one **task** (enforced by `UNIQUE(action_item_id)`). This prevents duplicate tasks on retry.

### Meetings & Tasks (One-to-Many)

Tasks can optionally link to a source **meeting**. When a meeting is deleted, `meeting_id` is set to NULL; the task persists.

### Tasks & Comments (One-to-Many)

Tasks have a flat **comment** thread. Comments support @mentions which trigger notifications.

### Tasks & Status History (One-to-Many)

Every status transition creates an immutable **history** record for audit and analytics.

### Users & Notifications (One-to-Many)

**Notifications** are user-scoped. Optional `workspace_id` provides context. Payload JSONB contains event-specific data and deep links.

### Workspaces & Activity Logs (One-to-Many)

**Activity logs** provide an immutable audit trail of workspace events (meeting created, task completed, member added, etc.).

### Auth Tables

- **refresh_tokens:** Hashed refresh tokens for session management; revoked on logout/password change
- **password_reset_tokens:** Single-use tokens for password reset flow

---

## Cardinality Summary

| Parent | Child | Relationship |
|--------|-------|--------------|
| users | workspace_members | 1:N |
| workspaces | workspace_members | 1:N |
| workspaces | meetings | 1:N |
| meetings | meeting_transcripts | 1:1 |
| meetings | meeting_ai_outputs | 1:1 |
| meetings | ai_processing_jobs | 1:N |
| meetings | action_item_suggestions | 1:N |
| meetings | tasks | 1:N |
| action_item_suggestions | tasks | 1:1 |
| tasks | task_comments | 1:N |
| tasks | task_status_history | 1:N |
| users | notifications | 1:N |
| workspaces | activity_logs | 1:N |

---

## Related Documents

- [database-architecture.md](./database-architecture.md) — Full schema, indexes, performance
- [database-design.md](./database-design.md) — Original design reference
