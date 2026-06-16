-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "action_item_id" UUID;

-- CreateTable
CREATE TABLE "ai_processing_jobs" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "idempotency_key" VARCHAR(255),
    "bull_job_id" VARCHAR(255),
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tasks_action_item_id_key" ON "tasks"("action_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_processing_jobs_idempotency_key_key" ON "ai_processing_jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "idx_ai_jobs_meeting" ON "ai_processing_jobs"("meeting_id");

-- CreateIndex
CREATE INDEX "idx_ai_jobs_status" ON "ai_processing_jobs"("status");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_action_item_id_fkey" FOREIGN KEY ("action_item_id") REFERENCES "action_item_suggestions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_processing_jobs" ADD CONSTRAINT "ai_processing_jobs_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_processing_jobs" ADD CONSTRAINT "ai_processing_jobs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
