-- Enable pgvector extension for MeetingMind AI semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Document source types for vector chunks
CREATE TYPE "DocumentSourceType" AS ENUM ('TRANSCRIPT', 'SUMMARY', 'DECISION', 'ACTION_ITEM', 'KNOWLEDGE');

-- Embedding job status
CREATE TYPE "EmbeddingJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- document_chunks: vector-indexed content for RAG (scaffold — no application logic yet)
CREATE TABLE "document_chunks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "meeting_id" UUID,
    "source_type" "DocumentSourceType" NOT NULL,
    "source_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL,
    "token_count" INTEGER NOT NULL,
    "embedding" vector(1536),
    "embedding_model" VARCHAR(100) NOT NULL DEFAULT 'text-embedding-3-small',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- embedding_jobs: tracks async embedding pipeline status
CREATE TABLE "embedding_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "meeting_id" UUID,
    "status" "EmbeddingJobStatus" NOT NULL DEFAULT 'PENDING',
    "chunks_total" INTEGER NOT NULL DEFAULT 0,
    "chunks_processed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "embedding_jobs_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_meeting_id_fkey"
    FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "embedding_jobs" ADD CONSTRAINT "embedding_jobs_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "embedding_jobs" ADD CONSTRAINT "embedding_jobs_meeting_id_fkey"
    FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes (scaffold — tuned in future feature pass)
CREATE UNIQUE INDEX "document_chunks_source_unique" ON "document_chunks"("workspace_id", "source_type", "source_id", "chunk_index");
CREATE INDEX "idx_document_chunks_workspace" ON "document_chunks"("workspace_id");
CREATE INDEX "idx_document_chunks_meeting" ON "document_chunks"("meeting_id");
CREATE INDEX "idx_document_chunks_search_vector" ON "document_chunks" USING GIN ("search_vector");
CREATE INDEX "idx_embedding_jobs_workspace" ON "embedding_jobs"("workspace_id", "status");
CREATE INDEX "idx_document_chunks_workspace_source" ON "document_chunks"("workspace_id", "source_type");
