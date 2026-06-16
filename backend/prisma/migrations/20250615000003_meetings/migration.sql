-- CreateEnum
CREATE TYPE "AiProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ActionItemStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "meeting_transcripts" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "source_format" VARCHAR(20) NOT NULL DEFAULT 'text',
    "char_count" INTEGER NOT NULL,
    "storage_key" VARCHAR(500),
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_ai_outputs" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "summary" TEXT,
    "topics" JSONB NOT NULL DEFAULT '[]',
    "decisions" JSONB NOT NULL DEFAULT '[]',
    "risks" JSONB NOT NULL DEFAULT '[]',
    "raw_response" JSONB,
    "processing_status" "AiProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "model_version" VARCHAR(50),
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "processed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "meeting_ai_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_item_suggestions" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "suggested_assignee_id" UUID,
    "suggested_due_date" DATE,
    "status" "ActionItemStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_item_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meeting_transcripts_meeting_id_key" ON "meeting_transcripts"("meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_ai_outputs_meeting_id_key" ON "meeting_ai_outputs"("meeting_id");

-- CreateIndex
CREATE INDEX "idx_action_items_meeting" ON "action_item_suggestions"("meeting_id");

-- AddForeignKey
ALTER TABLE "meeting_transcripts" ADD CONSTRAINT "meeting_transcripts_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_ai_outputs" ADD CONSTRAINT "meeting_ai_outputs_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_item_suggestions" ADD CONSTRAINT "action_item_suggestions_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_item_suggestions" ADD CONSTRAINT "action_item_suggestions_suggested_assignee_id_fkey" FOREIGN KEY ("suggested_assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
