-- Google Sign-In + Meet link fields

CREATE TYPE "AuthProvider" AS ENUM ('PASSWORD', 'GOOGLE', 'BOTH');

ALTER TYPE "NotificationType" ADD VALUE 'MEETING_STARTING_SOON';

ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "auth_provider" "AuthProvider" NOT NULL DEFAULT 'PASSWORD';
ALTER TABLE "users" ADD COLUMN "google_sub" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "google_email" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "google_refresh_token_enc" TEXT;
ALTER TABLE "users" ADD COLUMN "google_access_token_enc" TEXT;
ALTER TABLE "users" ADD COLUMN "google_token_expires_at" TIMESTAMPTZ;

CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");

ALTER TABLE "meetings" ADD COLUMN "meet_url" VARCHAR(500);
ALTER TABLE "meetings" ADD COLUMN "calendar_html_link" VARCHAR(500);
ALTER TABLE "meetings" ADD COLUMN "start_reminder_sent_at" TIMESTAMPTZ;
