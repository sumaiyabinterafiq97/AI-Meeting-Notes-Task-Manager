# API Architecture Review

**Product:** AI Meeting Notes & Task Manager  
**Version:** 1.0  
**Review Date:** 2026-06-15  
**Base URL:** `https://api.example.com/api/v1`

---

## Executive Summary

The existing [api-design.md](./api-design.md) provides comprehensive endpoint coverage suitable for MVP. This review validates REST conventions, identifies improvements, and establishes production-grade standards for versioning, auth, errors, and rate limiting.

**Verdict:** ✅ Approved with improvements below applied.

---

## 1. Endpoint Naming Review

### Strengths
- Resource-oriented URLs (`/workspaces/:id/meetings`)
- Nested resources reflect ownership hierarchy
- Plural nouns for collections
- HTTP verbs used correctly (GET, POST, PATCH, DELETE, PUT)

### Improvements Applied

| Issue | Before | After |
|-------|--------|-------|
| Mixed auth paths | `/auth/me` and `/users/me` | `/users/me` for profile; `/auth/me` as alias (deprecated) |
| Action endpoints | `/action-items/accept` | Keep — RPC-style acceptable for non-CRUD actions |
| Invitation accept | `/invitations/:token/accept` | Keep — token is global, not workspace-scoped |
| Reprocess | `POST .../reprocess` | Keep — clear intent |
| Board endpoint | `/tasks/board` | Keep — collection view variant |

### Naming Conventions (Standard)

```
GET    /resources              — List (paginated)
POST   /resources              — Create
GET    /resources/:id          — Read one
PATCH  /resources/:id          — Partial update
PUT    /resources/:id/sub      — Replace sub-resource (transcript)
DELETE /resources/:id          — Delete (soft)
POST   /resources/:id/actions  — Non-CRUD actions (accept, reprocess)
```

---

## 2. REST Standards Compliance

| Principle | Status | Notes |
|-----------|--------|-------|
| Stateless | ✅ | JWT access token; no server session |
| Uniform interface | ✅ | Consistent JSON request/response |
| Resource identification | ✅ | UUIDs in URLs |
| HTTP status codes | ✅ | 201 create, 204 delete, 409 conflict |
| HATEOAS | ⚠️ Deferred | Optional `_links` in v2 |
| Idempotency | ⚠️ Improved | `Idempotency-Key` header on accept, create task |
| Pagination | ✅ | `page` + `limit` with meta |
| Filtering | ✅ | Query params on list endpoints |

### Idempotency-Key Support (New)

Required on:
- `POST .../action-items/accept`
- `POST /workspaces/:id/tasks` (when `actionItemId` present)

```
Idempotency-Key: <uuid>
```

Server stores key + response for 24h; duplicate requests return cached response.

---

## 3. Versioning Strategy

| Aspect | Decision |
|--------|----------|
| URL prefix | `/api/v1` |
| Breaking changes | New major version `/api/v2` |
| Deprecation | `Sunset` header + 6-month notice |
| Non-breaking additions | Add fields to response; new optional query params |
| OpenAPI | `/api/v1/openapi.json` served from API |

### Version Lifecycle

1. **v1** — MVP launch; all current endpoints
2. **v1.1** — Additive only (new fields, endpoints)
3. **v2** — Breaking changes (SSO, org model, webhook signatures)

---

## 4. Authentication Strategy

### Token Model

| Token | Storage | Lifetime | Transport |
|-------|---------|----------|-----------|
| Access (JWT) | Client memory | 15 min | `Authorization: Bearer` |
| Refresh | httpOnly cookie | 7 days | Cookie on `/auth/refresh` only |

### Auth Flow

```
1. Login/Register → access token (body) + refresh token (cookie)
2. API calls → Bearer access token
3. 401 → POST /auth/refresh (cookie sent automatically)
4. New access token → retry original request
5. Refresh fails → redirect to login
```

### Endpoint Auth Matrix

| Endpoint | Auth |
|----------|------|
| `/auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password` | Public |
| `/auth/refresh` | Refresh cookie |
| `/auth/logout` | Bearer + cookie |
| `/health` | Public |
| `/workspaces/*` | Bearer + workspace membership |
| `/notifications` | Bearer (user-scoped) |
| `/invitations/:token/accept` | Bearer + email match |

### Improvements

- **Refresh token rotation:** Issue new refresh on every refresh; revoke old
- **Token family detection:** Revoke all tokens if reuse detected (stolen token)
- **JWT `jti` claim:** Enable per-token revocation list (optional MVP+1)

---

## 5. Error Handling

### Standard Error Envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary",
    "details": [
      { "field": "email", "message": "Invalid email format", "code": "invalid_string" }
    ],
    "requestId": "req_abc123"
  }
}
```

### Error Code Catalog

| HTTP | Code | When |
|------|------|------|
| 400 | VALIDATION_ERROR | Zod validation failure |
| 400 | INVALID_STATE | e.g., upload while PROCESSING |
| 401 | UNAUTHORIZED | Missing/invalid/expired token |
| 403 | FORBIDDEN | Valid auth, insufficient permission |
| 404 | NOT_FOUND | Resource not found (or no access — same response) |
| 409 | CONFLICT | Duplicate, concurrent processing |
| 410 | GONE | Expired invitation |
| 422 | UNPROCESSABLE | Business rule violation |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Unhandled exception |
| 503 | SERVICE_UNAVAILABLE | DB down, AI queue full |

### Security: Information Leakage

- **404 vs 403:** Return 404 for resources user cannot access (prevent enumeration)
- **Login errors:** Generic "Invalid credentials" always
- **500 errors:** Never expose stack traces in production

### Response Headers

```
X-Request-Id: req_abc123
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1718452800
```

---

## 6. Rate Limiting

### Tiered Limits

| Tier | Scope | Limit | Window |
|------|-------|-------|--------|
| Auth | IP | 10 requests | 1 min |
| Auth failures | email + IP | 5 failures | 15 min |
| Password reset | email | 3 requests | 1 hour |
| General API | user | 100 requests | 1 min |
| AI trigger | workspace | 20 requests | 1 hour |
| Search | user | 30 requests | 1 min |
| Invitation accept | IP | 10 requests | 1 min |

### Implementation

- **MVP:** `express-rate-limit` with in-memory store
- **Production:** Redis-backed rate limiter (shared across instances)

### 429 Response

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Retry after 45 seconds.",
    "retryAfter": 45
  }
}
```

Header: `Retry-After: 45`

---

## 7. Request/Response Standards

### Request

- `Content-Type: application/json` (required for body)
- `Accept: application/json`
- `Authorization: Bearer <token>` (protected routes)
- `Idempotency-Key: <uuid>` (mutations requiring idempotency)
- `X-Request-Id: <uuid>` (optional client-provided; server generates if missing)

### Response

- Dates: ISO 8601 UTC (`2026-06-15T10:30:00.000Z`)
- IDs: UUID v4 strings
- Null fields: Include as `null` (don't omit)
- Empty arrays: `[]` not omitted
- Pagination meta always present on list endpoints

### Casing

- JSON: `camelCase` (JavaScript convention)
- Database: `snake_case` (Prisma `@map` handles conversion)

---

## 8. Endpoint-Specific Improvements

### Meetings

| Endpoint | Improvement |
|----------|-------------|
| `PUT .../transcript` | Return `202 Accepted` if async preferred; current `200` OK |
| `GET .../meetings/:id` | Include `processingJob` status in response |
| `POST .../reprocess` | Require confirmation header `X-Confirm-Reprocess: true` |

### Tasks

| Endpoint | Improvement |
|----------|-------------|
| `GET .../tasks/board` | Add `?doneLimit=50` query param |
| `PATCH .../tasks/:id` | Validate assignee is workspace member |
| `POST .../comments` | Return `201` with parsed mentions array |

### Dashboard

| Endpoint | Improvement |
|----------|-------------|
| `GET .../dashboard` | Consider splitting in v1.1 for parallel fetch |
| Cache | `Cache-Control: private, max-age=30` for stats |

### Search

| Endpoint | Improvement |
|----------|-------------|
| `GET .../search` | Minimum `q` length 2; return 400 if shorter |
| Highlighting | Return `highlights: { field, snippet }` in results |

---

## 9. Webhooks (v2 Preview)

```
POST https://customer.com/webhooks
X-Webhook-Signature: sha256=...
X-Webhook-Id: wh_abc123

{ "event": "meeting.processed", "timestamp": "...", "data": { ... } }
```

---

## 10. OpenAPI Generation

- Generate from Zod schemas + route definitions (`@asteasolutions/zod-to-openapi`)
- Publish at `/api/v1/openapi.json`
- Swagger UI at `/api/v1/docs` (staging only)
- CI check: spec diff on PR

---

## 11. Review Checklist

| Item | Status |
|------|--------|
| Consistent URL structure | ✅ |
| Proper HTTP verbs | ✅ |
| Pagination on all lists | ✅ |
| Error envelope standardized | ✅ Improved |
| Auth strategy documented | ✅ Improved |
| Rate limits defined | ✅ Improved |
| Idempotency on critical mutations | ✅ Added |
| Versioning strategy | ✅ Added |
| No breaking changes needed for MVP | ✅ |

---

## Related Documents

- [api-design.md](./api-design.md) — Full endpoint reference
- [security-architecture.md](./security-architecture.md) — Auth security details
- [system-architecture.md](./system-architecture.md) — Request flows
