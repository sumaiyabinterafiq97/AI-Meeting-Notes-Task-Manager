# Database Architecture

**Product:** AI Meeting Notes & Task Manager  
**Version:** 1.0  
**Database:** PostgreSQL 16 (Neon)  
**ORM:** Prisma  
**Canonical ERD:** [erd.md](./erd.md)

---

## 1. Entity Analysis

### 1.1 Normalization Assessment

| Entity | Normal Form | Notes |
|--------|-------------|-------|
| users | 3NF | Profile data atomic; no transitive deps |
| workspaces | 3NF | Slug derived but stored for URL stability |
| workspace_members | 3NF | Junction table with role attribute |
| meetings | 3NF | Attendees as JSONB acceptable (variable schema) |
| meeting_transcripts | 2NF+ | Separated from meetings (large TEXT, 1:1) |
| meeting_ai_outputs | 3NF | Decisions/risks as JSONB (variable count, read-heavy) |
| action_item_suggestions | 3NF | Proper FK to meeting and suggested assignee |
| tasks | 3NF | Optional FKs to meeting and action_item |
| task_comments | 3NF | Separated from tasks |
| notifications | 3NF | Payload JSONB for flexible event data |
| ai_processing_jobs | 3NF | **New** — job state separated from AI output |

**Denormalization decisions (intentional):**
- `meetings.status` duplicates job state for fast list queries (avoid join)
- JSONB for AI decisions/risks (schema-flexible, read-heavy)
- Activity log metadata JSONB (event-specific fields)

### 1.2 Relationship Validation

| Relationship | Cardinality | FK Action | Validated |
|--------------|-------------|-----------|-----------|
| User ↔ Workspace | M:N via workspace_members | CASCADE on member delete | ✅ |
| Workspace → Meeting | 1:N | RESTRICT (soft-delete workspace first) | ✅ |
| Meeting → Transcript | 1:1 | CASCADE | ✅ |
| Meeting → AI Output | 1:1 | CASCADE | ✅ |
| Meeting → Action Items | 1:N | CASCADE | ✅ |
| Action Item → Task | 1:0..1 | SET NULL on action item delete | ✅ |
| Meeting → Task | 1:N | SET NULL on meeting delete | ✅ |
| Task → Comments | 1:N | CASCADE | ✅ |

### 1.3 Constraint Gaps Addressed

| Constraint | Purpose |
|------------|---------|
| `UNIQUE(workspace_id, user_id)` on workspace_members | Prevent duplicate membership |
| `UNIQUE(action_item_id)` on tasks | Idempotent task creation |
| `UNIQUE(meeting_id)` on meeting_transcripts | One transcript per meeting (MVP) |
| Check: workspace has ≥ 1 OWNER | Enforced in service layer + trigger (v2) |
| `assignee_id` must be workspace member | Enforced in service layer |

---

## 2. Final Database Schema

### 2.1 Enum Types

```sql
CREATE TYPE workspace_role AS ENUM ('OWNER', 'MEMBER');
CREATE TYPE meeting_status AS ENUM ('DRAFT', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE ai_processing_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE action_item_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE notification_type AS ENUM ('TASK_ASSIGNED', 'TASK_MENTION', 'TASK_DUE_SOON', 'TASK_OVERDUE', 'INVITATION', 'MEETING_PROCESSED');
CREATE TYPE chat_role AS ENUM ('USER', 'ASSISTANT');
CREATE TYPE job_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
```

### 2.2 Core Tables

#### `users`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| email | VARCHAR(255) | NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| display_name | VARCHAR(100) | NOT NULL |
| avatar_url | TEXT | NULL |
| email_verified_at | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL |
| deleted_at | TIMESTAMPTZ | NULL |

#### `workspaces`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(100) | NOT NULL |
| slug | VARCHAR(120) | NOT NULL, UNIQUE |
| description | TEXT | NULL |
| created_by_id | UUID | NOT NULL, FK → users(id) |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |
| deleted_at | TIMESTAMPTZ | NULL |

#### `workspace_members`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| workspace_id | UUID | NOT NULL, FK → workspaces(id) ON DELETE CASCADE |
| user_id | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE |
| role | workspace_role | NOT NULL DEFAULT 'MEMBER' |
| joined_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

**UNIQUE:** (workspace_id, user_id)

#### `workspace_invitations`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| workspace_id | UUID | NOT NULL, FK → workspaces(id) ON DELETE CASCADE |
| email | VARCHAR(255) | NOT NULL |
| role | workspace_role | NOT NULL DEFAULT 'MEMBER' |
| token_hash | VARCHAR(255) | NOT NULL, UNIQUE |
| invited_by_id | UUID | NOT NULL, FK → users(id) |
| expires_at | TIMESTAMPTZ | NOT NULL |
| accepted_at | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

#### `meetings`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| workspace_id | UUID | NOT NULL, FK → workspaces(id) |
| created_by_id | UUID | NOT NULL, FK → users(id) |
| title | VARCHAR(200) | NOT NULL |
| meeting_date | TIMESTAMPTZ | NOT NULL |
| duration_minutes | INT | NULL CHECK (duration_minutes > 0) |
| attendees | JSONB | NOT NULL DEFAULT '[]' |
| tags | TEXT[] | NOT NULL DEFAULT '{}' |
| agenda | TEXT | NULL |
| status | meeting_status | NOT NULL DEFAULT 'DRAFT' |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |
| deleted_at | TIMESTAMPTZ | NULL |

#### `meeting_transcripts`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| meeting_id | UUID | NOT NULL, UNIQUE, FK → meetings(id) ON DELETE CASCADE |
| content | TEXT | NOT NULL |
| source_format | VARCHAR(20) | NOT NULL DEFAULT 'text' |
| char_count | INT | NOT NULL |
| search_vector | TSVECTOR | GENERATED ALWAYS AS (to_tsvector('english', content)) STORED |
| storage_key | VARCHAR(500) | NULL |
| uploaded_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

#### `meeting_ai_outputs`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| meeting_id | UUID | NOT NULL, UNIQUE, FK → meetings(id) ON DELETE CASCADE |
| summary | TEXT | NULL |
| topics | JSONB | NOT NULL DEFAULT '[]' |
| decisions | JSONB | NOT NULL DEFAULT '[]' |
| risks | JSONB | NOT NULL DEFAULT '[]' |
| raw_response | JSONB | NULL |
| processing_status | ai_processing_status | NOT NULL DEFAULT 'PENDING' |
| error_message | TEXT | NULL |
| model_version | VARCHAR(50) | NULL |
| prompt_tokens | INT | NULL |
| completion_tokens | INT | NULL |
| processed_at | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

#### `ai_processing_jobs` *(new)*

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| meeting_id | UUID | NOT NULL, FK → meetings(id) ON DELETE CASCADE |
| workspace_id | UUID | NOT NULL, FK → workspaces(id) |
| status | job_status | NOT NULL DEFAULT 'PENDING' |
| attempt_count | INT | NOT NULL DEFAULT 0 |
| max_attempts | INT | NOT NULL DEFAULT 3 |
| idempotency_key | VARCHAR(255) | NULL, UNIQUE |
| bull_job_id | VARCHAR(255) | NULL |
| error_message | TEXT | NULL |
| started_at | TIMESTAMPTZ | NULL |
| completed_at | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

#### `action_item_suggestions`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| meeting_id | UUID | NOT NULL, FK → meetings(id) ON DELETE CASCADE |
| title | VARCHAR(300) | NOT NULL |
| description | TEXT | NULL |
| suggested_assignee_id | UUID | NULL, FK → users(id) |
| suggested_due_date | DATE | NULL |
| status | action_item_status | NOT NULL DEFAULT 'PENDING' |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

#### `tasks`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| workspace_id | UUID | NOT NULL, FK → workspaces(id) |
| meeting_id | UUID | NULL, FK → meetings(id) ON DELETE SET NULL |
| action_item_id | UUID | NULL, UNIQUE, FK → action_item_suggestions(id) |
| created_by_id | UUID | NOT NULL, FK → users(id) |
| assignee_id | UUID | NULL, FK → users(id) |
| title | VARCHAR(300) | NOT NULL |
| description | TEXT | NULL |
| status | task_status | NOT NULL DEFAULT 'TODO' |
| priority | task_priority | NOT NULL DEFAULT 'MEDIUM' |
| due_date | DATE | NULL |
| position | INT | NOT NULL DEFAULT 0 |
| completed_at | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |
| deleted_at | TIMESTAMPTZ | NULL |

#### `task_comments`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| task_id | UUID | NOT NULL, FK → tasks(id) ON DELETE CASCADE |
| author_id | UUID | NOT NULL, FK → users(id) |
| content | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |
| deleted_at | TIMESTAMPTZ | NULL |

#### `task_status_history`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| task_id | UUID | NOT NULL, FK → tasks(id) ON DELETE CASCADE |
| from_status | task_status | NULL |
| to_status | task_status | NOT NULL |
| changed_by_id | UUID | NOT NULL, FK → users(id) |
| changed_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

#### `notifications`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE |
| workspace_id | UUID | NULL, FK → workspaces(id) ON DELETE CASCADE |
| type | notification_type | NOT NULL |
| payload | JSONB | NOT NULL |
| is_read | BOOLEAN | NOT NULL DEFAULT false |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

#### `notification_preferences` *(new)*

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | NOT NULL, UNIQUE, FK → users(id) ON DELETE CASCADE |
| email_task_assigned | BOOLEAN | NOT NULL DEFAULT true |
| email_due_soon | BOOLEAN | NOT NULL DEFAULT true |
| email_mentions | BOOLEAN | NOT NULL DEFAULT true |
| in_app_all | BOOLEAN | NOT NULL DEFAULT true |
| updated_at | TIMESTAMPTZ | NOT NULL |

#### `activity_logs`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| workspace_id | UUID | NOT NULL, FK → workspaces(id) ON DELETE CASCADE |
| actor_id | UUID | NOT NULL, FK → users(id) |
| action | VARCHAR(50) | NOT NULL |
| entity_type | VARCHAR(50) | NOT NULL |
| entity_id | UUID | NOT NULL |
| metadata | JSONB | NOT NULL DEFAULT '{}' |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

#### `meeting_chat_messages` (MVP+1)

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| meeting_id | UUID | NOT NULL, FK → meetings(id) ON DELETE CASCADE |
| user_id | UUID | NOT NULL, FK → users(id) |
| role | chat_role | NOT NULL |
| content | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

#### Auth Tables

**`refresh_tokens`:** id, user_id, token_hash (UNIQUE), expires_at, revoked_at, created_at, user_agent, ip_address

**`password_reset_tokens`:** id, user_id, token_hash (UNIQUE), expires_at, used_at, created_at

---

## 3. Index Strategy

### Primary Access Patterns

| Query Pattern | Index |
|---------------|-------|
| User login by email | `users_email_active_idx` UNIQUE (email) WHERE deleted_at IS NULL |
| User's workspaces | `idx_wm_user_id` ON workspace_members(user_id) |
| Meetings by workspace, date | `idx_meetings_workspace_date` ON (workspace_id, meeting_date DESC) WHERE deleted_at IS NULL |
| Tasks by workspace + status | `idx_tasks_workspace_status` ON (workspace_id, status) WHERE deleted_at IS NULL |
| Tasks by assignee | `idx_tasks_assignee` ON (assignee_id, status) WHERE deleted_at IS NULL |
| Overdue tasks | `idx_tasks_overdue` ON (workspace_id, due_date) WHERE deleted_at IS NULL AND status != 'DONE' |
| Unread notifications | `idx_notifications_unread` ON (user_id, created_at DESC) WHERE is_read = false |
| Full-text transcript search | `idx_transcripts_search` GIN (search_vector) |
| Full-text summary search | `idx_ai_summary_search` GIN (to_tsvector('english', coalesce(summary, ''))) |
| Fuzzy title search | `idx_meetings_title_trgm` GIN (title gin_trgm_ops) |
| Pending AI jobs | `idx_jobs_pending` ON (status, created_at) WHERE status = 'PENDING' |
| Activity feed | `idx_activity_workspace` ON (workspace_id, created_at DESC) |

### Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

---

## 4. Performance Recommendations

### 4.1 Query Optimization

- **Meeting list:** Use covering index `(workspace_id, meeting_date DESC)` with partial `deleted_at IS NULL`
- **Dashboard stats:** Pre-aggregate with conditional counts in single query; avoid N+1
- **Kanban board:** Three queries or single query with `GROUP BY status`; paginate DONE
- **Meeting detail:** Single query with Prisma `include` for transcript, aiOutput, actionItems

### 4.2 Pagination Strategy

| Endpoint | Strategy | Default | Max |
|----------|----------|---------|-----|
| List endpoints | Offset (`page`, `limit`) | 20 | 100 |
| Activity feed | Cursor (`createdAt`, `id`) | 30 | 50 |
| Kanban DONE column | Offset within column | 50 | 100 |
| Search results | Offset with relevance rank | 20 | 50 |

**Future:** Migrate high-volume lists to cursor-based pagination.

### 4.3 Search Strategy

| Phase | Approach |
|-------|----------|
| MVP | `ILIKE` on title + `pg_trgm` fuzzy match |
| MVP+1 | PostgreSQL FTS on `search_vector` (transcripts) and summary |
| v2 | pgvector embeddings for semantic search |

### 4.4 Connection Pooling

- **Application:** Neon pooled connection string; max 20 connections per instance
- **Migrations:** Direct (non-pooled) connection
- **Workers:** Separate pool (max 10) to avoid starving API

### 4.5 Storage Migration Path

When transcripts exceed 10k meetings or DB > 50GB:

1. Add `storage_key` to `meeting_transcripts`
2. Upload new transcripts to S3/R2
3. Background job migrates existing TEXT → object storage
4. API reads from object storage when `storage_key` present

---

## 5. Migration & Seeding

1. `001_init` — enums, core tables
2. `002_auth` — refresh_tokens, password_reset_tokens
3. `003_ai_jobs` — ai_processing_jobs
4. `004_search` — search_vector generated column
5. `seed.ts` — dev-only demo user, workspace, meeting

All migrations via `prisma migrate deploy` in CI/CD pipeline.

---

## 6. Related Documents

- [erd.md](./erd.md) — Visual entity relationship diagram
- [database-design.md](./database-design.md) — Original design reference
- [scalability-design.md](./scalability-design.md) — Scale strategies
