# Google Meet + Calendar Integration

MeetingMind connects a user's Google identity to Calendar events with Google Meet links — without paid Meet bots.

## Capabilities

1. **Google Sign-In** — `GET /api/v1/auth/google` (OAuth code flow)
2. **Calendar / Meet connect** — workspace Settings → Connect Google (or tokens from Sign-In)
3. **Create meeting → Meet link** — when Google is available, creates a Calendar event with `conferenceData` Meet
4. **Join from MeetingMind** — opens `meetUrl` in a new tab
5. **Reminders** — Google popup/email (~10 min) + in-app `MEETING_STARTING_SOON` during calendar sync

## Google Cloud setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Google Calendar API**
3. Configure **OAuth consent screen** (External or Internal)
4. Create **OAuth 2.0 Client ID** (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:3001/api/v1/auth/google/callback` (Sign-In)
   - `http://localhost:3001/api/v1/calendar/oauth/google/callback` (Calendar connect)
6. Scopes (consent screen):
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.readonly` (sync)

Prefer **one** OAuth client for Sign-In + Calendar.

## Environment

```bash
# Preferred aliases (Sign-In)
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3001/api/v1/auth/google/callback

# Calendar (falls back from GOOGLE_OAUTH_* if unset)
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3001/api/v1/calendar/oauth/google/callback

CALENDAR_TOKEN_SECRET=  # encrypts refresh tokens at rest (falls back to JWT secret)
CALENDAR_USE_MOCK=true  # CI / local without Google
GOOGLE_AUTH_USE_MOCK=true
MEETING_START_REMINDER_MINUTES=15
```

## Auth linking rules

| Case | Behavior |
|------|----------|
| New Google user | Create user (`authProvider=GOOGLE`, optional password) |
| Same email, password account, no `googleSub` | Safe link → `BOTH` (Google verified email) |
| Email already linked to different `googleSub` | **409 CONFLICT** — never silent takeover |
| Google-only user password login | Reject with guidance to Continue with Google |

## Meeting create compensating behavior

1. Always create the local MeetingMind meeting first
2. Best-effort: create Google event + Meet via `calendarMeetService.createMeetForMeeting`
3. On Google failure: **keep local meeting**, leave `meetUrl` null, log warning
4. Never roll back the local meeting if Calendar API fails

## Data fields

- `User.googleSub`, `googleEmail`, `authProvider`, encrypted Google tokens
- `Meeting.meetUrl`, `calendarHtmlLink`, `externalCalendarEventId`, `startReminderSentAt`

## Observability

- `google_oauth.success` / `google_oauth.failure`
- `meet_link.created`
- `reminder.sent` (`type=transcript|meeting_start`)

## Manual QA

1. Continue with Google → lands in workspaces signed in
2. Settings → Connect Google Calendar (or mock)
3. Create meeting → detail shows Meet URL + Join
4. With `CALENDAR_USE_MOCK=true`, Meet URL is `https://meet.google.com/mock-…`
5. Disconnect Google → create meeting still succeeds without Meet link
6. Existing password login still works; Google-only accounts cannot password-login
