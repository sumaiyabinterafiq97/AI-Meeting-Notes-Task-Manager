-- Phase 8: Calendar integration

CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'MICROSOFT');
CREATE TYPE "CalendarConnectionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'ERROR');
CREATE TYPE "MeetingSource" AS ENUM ('MANUAL', 'GOOGLE_CALENDAR', 'MICROSOFT_CALENDAR');

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MEETING_TRANSCRIPT_REMINDER';

ALTER TABLE "meetings" ADD COLUMN "source" "MeetingSource" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "meetings" ADD COLUMN "external_calendar_event_id" VARCHAR(255);
ALTER TABLE "meetings" ADD COLUMN "calendar_connection_id" UUID;

CREATE UNIQUE INDEX "uq_meetings_workspace_external_event" ON "meetings"("workspace_id", "external_calendar_event_id");

CREATE TABLE "calendar_connections" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "connected_by_id" UUID NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "status" "CalendarConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "access_token_enc" TEXT NOT NULL,
    "refresh_token_enc" TEXT,
    "token_expires_at" TIMESTAMPTZ,
    "calendar_id" VARCHAR(255),
    "account_email" VARCHAR(255),
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMPTZ,
    "last_sync_error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_calendar_connection_workspace_provider" ON "calendar_connections"("workspace_id", "provider");
CREATE INDEX "idx_calendar_connections_workspace" ON "calendar_connections"("workspace_id");

ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_connected_by_id_fkey" FOREIGN KEY ("connected_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "calendar_synced_events" (
    "id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "external_event_id" VARCHAR(255) NOT NULL,
    "meeting_id" UUID,
    "event_title" VARCHAR(300) NOT NULL,
    "event_start" TIMESTAMPTZ NOT NULL,
    "event_end" TIMESTAMPTZ,
    "attendee_emails" JSONB NOT NULL DEFAULT '[]',
    "event_payload" JSONB NOT NULL DEFAULT '{}',
    "reminder_sent_at" TIMESTAMPTZ,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "calendar_synced_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "calendar_synced_events_meeting_id_key" ON "calendar_synced_events"("meeting_id");
CREATE UNIQUE INDEX "uq_calendar_synced_event_connection_external" ON "calendar_synced_events"("connection_id", "external_event_id");
CREATE INDEX "idx_calendar_synced_events_workspace" ON "calendar_synced_events"("workspace_id", "event_start" DESC);

ALTER TABLE "calendar_synced_events" ADD CONSTRAINT "calendar_synced_events_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "calendar_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_synced_events" ADD CONSTRAINT "calendar_synced_events_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "meetings" ADD CONSTRAINT "meetings_calendar_connection_id_fkey" FOREIGN KEY ("calendar_connection_id") REFERENCES "calendar_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
