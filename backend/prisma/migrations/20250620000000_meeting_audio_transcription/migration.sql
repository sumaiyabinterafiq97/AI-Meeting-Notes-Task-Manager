-- Phase 7: Voice transcription — meeting audio + TRANSCRIBING status

ALTER TYPE "MeetingStatus" ADD VALUE IF NOT EXISTS 'TRANSCRIBING';

CREATE TYPE "TranscriptionJobStatus" AS ENUM ('PENDING', 'TRANSCRIBING', 'COMPLETED', 'FAILED');

CREATE TABLE "meeting_audio" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "status" "TranscriptionJobStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "bull_job_id" VARCHAR(255),
    "transcribed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "meeting_audio_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "meeting_audio_meeting_id_key" ON "meeting_audio"("meeting_id");
CREATE INDEX "idx_meeting_audio_workspace" ON "meeting_audio"("workspace_id");

ALTER TABLE "meeting_audio" ADD CONSTRAINT "meeting_audio_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_audio" ADD CONSTRAINT "meeting_audio_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
