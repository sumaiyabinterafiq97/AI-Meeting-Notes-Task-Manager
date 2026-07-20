-- Capture layer: platform import metadata + expanded MeetingSource values

ALTER TYPE "MeetingSource" ADD VALUE 'ZOOM_IMPORT';
ALTER TYPE "MeetingSource" ADD VALUE 'GOOGLE_MEET_IMPORT';
ALTER TYPE "MeetingSource" ADD VALUE 'TEAMS_IMPORT';

CREATE TYPE "MeetingImportProvider" AS ENUM ('ZOOM', 'GOOGLE_MEET', 'TEAMS');
CREATE TYPE "MeetingImportStatus" AS ENUM ('PENDING', 'IMPORTED', 'FAILED');

CREATE TABLE "meeting_imports" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "provider" "MeetingImportProvider" NOT NULL,
    "external_meeting_id" VARCHAR(255),
    "external_recording_id" VARCHAR(255),
    "status" "MeetingImportStatus" NOT NULL DEFAULT 'IMPORTED',
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "meeting_imports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "meeting_imports_meeting_id_key" ON "meeting_imports"("meeting_id");
CREATE INDEX "idx_meeting_imports_workspace_provider" ON "meeting_imports"("workspace_id", "provider");
CREATE INDEX "idx_meeting_imports_external_meeting" ON "meeting_imports"("external_meeting_id");

ALTER TABLE "meeting_imports" ADD CONSTRAINT "meeting_imports_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_imports" ADD CONSTRAINT "meeting_imports_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
