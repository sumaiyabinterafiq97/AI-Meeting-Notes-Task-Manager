-- MeetingMind AI Phase 0 — observability, chat, knowledge, reports

-- Chat roles
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- LLM invocation status
CREATE TYPE "LlmInvocationStatus" AS ENUM ('COMPLETED', 'FAILED');

-- Knowledge entity types
CREATE TYPE "KnowledgeEntityType" AS ENUM ('PERSON', 'PROJECT', 'DECISION', 'CONCEPT', 'PROCESS', 'OTHER');

-- -----------------------------------------------------------------------------
-- Observability
-- -----------------------------------------------------------------------------

CREATE TABLE "llm_invocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "meeting_id" UUID,
    "correlation_id" VARCHAR(255),
    "request_id" VARCHAR(255),
    "workflow" VARCHAR(50) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost_usd" DECIMAL(12, 6) NOT NULL DEFAULT 0,
    "latency_ms" INTEGER,
    "status" "LlmInvocationStatus" NOT NULL DEFAULT 'COMPLETED',
    "error_message" TEXT,
    "prompt_id" VARCHAR(100),
    "prompt_version" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_invocations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "llm_usage_daily" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "usage_date" DATE NOT NULL,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "embedding_tokens" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost_usd" DECIMAL(12, 6) NOT NULL DEFAULT 0,
    "invocation_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_usage_daily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_executions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID,
    "workspace_id" UUID NOT NULL,
    "meeting_id" UUID,
    "correlation_id" VARCHAR(255),
    "agent_type" VARCHAR(50) NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "latency_ms" INTEGER,
    "model" VARCHAR(100),
    "provider" VARCHAR(50),
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_executions_pkey" PRIMARY KEY ("id")
);

-- -----------------------------------------------------------------------------
-- Chat
-- -----------------------------------------------------------------------------

CREATE TABLE "chat_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "meeting_id" UUID,
    "title" VARCHAR(200),
    "rolling_summary" TEXT,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "user_id" UUID,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB NOT NULL DEFAULT '[]',
    "token_usage" JSONB,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- -----------------------------------------------------------------------------
-- Knowledge & reports
-- -----------------------------------------------------------------------------

CREATE TABLE "knowledge_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "source_meeting_id" UUID,
    "entity_type" "KnowledgeEntityType" NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "knowledge_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspace_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "content_markdown" TEXT NOT NULL,
    "content_json" JSONB NOT NULL DEFAULT '{}',
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "model_version" VARCHAR(50),
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "generated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_reports_pkey" PRIMARY KEY ("id")
);

-- -----------------------------------------------------------------------------
-- Foreign keys
-- -----------------------------------------------------------------------------

ALTER TABLE "llm_invocations" ADD CONSTRAINT "llm_invocations_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "llm_invocations" ADD CONSTRAINT "llm_invocations_meeting_id_fkey"
    FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "llm_usage_daily" ADD CONSTRAINT "llm_usage_daily_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "ai_processing_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_meeting_id_fkey"
    FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_meeting_id_fkey"
    FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "knowledge_entries" ADD CONSTRAINT "knowledge_entries_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_entries" ADD CONSTRAINT "knowledge_entries_source_meeting_id_fkey"
    FOREIGN KEY ("source_meeting_id") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workspace_reports" ADD CONSTRAINT "workspace_reports_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX "idx_llm_invocations_workspace" ON "llm_invocations"("workspace_id", "created_at" DESC);
CREATE INDEX "idx_llm_invocations_correlation" ON "llm_invocations"("correlation_id");
CREATE INDEX "idx_llm_invocations_workflow" ON "llm_invocations"("workflow", "created_at" DESC);

CREATE UNIQUE INDEX "llm_usage_daily_workspace_date_unique" ON "llm_usage_daily"("workspace_id", "usage_date");

CREATE INDEX "idx_agent_executions_job" ON "agent_executions"("job_id");
CREATE INDEX "idx_agent_executions_workspace" ON "agent_executions"("workspace_id", "created_at" DESC);
CREATE INDEX "idx_agent_executions_agent" ON "agent_executions"("agent_type", "status");

CREATE INDEX "idx_chat_sessions_workspace_user" ON "chat_sessions"("workspace_id", "user_id", "updated_at" DESC);
CREATE INDEX "idx_chat_sessions_meeting_user" ON "chat_sessions"("meeting_id", "user_id");

CREATE INDEX "idx_chat_messages_session" ON "chat_messages"("session_id", "created_at");

CREATE INDEX "idx_knowledge_entries_workspace" ON "knowledge_entries"("workspace_id", "entity_type");
CREATE INDEX "idx_knowledge_entries_meeting" ON "knowledge_entries"("source_meeting_id");

CREATE INDEX "idx_workspace_reports_workspace" ON "workspace_reports"("workspace_id", "period_start" DESC);

-- Vector index tuning (from vector-db-design.md)
CREATE INDEX IF NOT EXISTS "idx_document_chunks_workspace_source"
    ON "document_chunks"("workspace_id", "source_type");

CREATE INDEX IF NOT EXISTS "idx_document_chunks_embedding_hnsw"
    ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
    WHERE "embedding" IS NOT NULL;
