# Security Audit — MeetingMind AI

**Date:** 2026-06-22  
**Auditor role:** Principal Security Engineer  
**Scope:** API, auth, multi-tenancy, LLM/RAG, observability

---

## Summary

| Control | Status | Notes |
|---------|--------|-------|
| JWT (HS256, 15m) | ✅ | Memory-only client storage per security-architecture.md |
| Refresh rotation | ✅ | httpOnly cookie |
| Workspace isolation | ✅ | `workspace_id` on queries; integration tests |
| RBAC | ✅ | `requireRole` middleware |
| Input validation (Zod) | ✅ | Request bodies + AI outputs |
| Prompt injection detection | ✅ | `inputSanitizerService.detectPromptInjection` |
| SQL injection | ✅ | Prisma parameterized queries |
| XSS (API) | ✅ | JSON responses; helmet CSP |
| CSRF | ✅ | SameSite=Strict refresh cookie |
| Rate limiting | ✅ | express-rate-limit |
| Secret logging | ✅ | Pino redact paths in observability design |
| Observability auth | ⚠️ Fixed | `OBSERVABILITY_API_KEY` — **must be set in prod** |

---

## Findings

### SEC-001 — Unauthenticated observability admin (High) — **FIXED**

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Impact** | Dashboard, cost data, alert evaluation exposed without auth |
| **Root cause** | `/observability/dashboard`, `/optimization`, `/alerts/evaluate` had no middleware |
| **Fix** | `requireObservabilityAdmin` — requires `X-Observability-Key` when `OBSERVABILITY_API_KEY` set |
| **Priority** | P0 before production |

`GET /observability/metrics` remains open for Prometheus scrapers (restrict via network policy / VPC).

### SEC-002 — Prompt injection via transcript (Medium) — **Mitigated**

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Impact** | Malicious transcript could override agent behavior |
| **Mitigation** | Delimiter wrapping, pattern detection, Zod output validation |
| **Gap** | No automated red-team CI gate against all 60 eval adversarial cases |
| **Priority** | P1 — implement eval runner with injection suite |

### SEC-003 — Cross-tenant vector leak (Critical) — **Design OK, verify ongoing**

| Field | Value |
|-------|-------|
| **Severity** | Critical (if violated) |
| **Impact** | Workspace A retrieves Workspace B chunks |
| **Controls** | `workspaceId` mandatory on all vector queries; filter validator |
| **Recommendation** | Add integration test: embed in WS-A, search from WS-B → 0 results |

### SEC-004 — API keys in LLM prompts (Low)

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Impact** | Key exfiltration via chat |
| **Status** | Keys in env only; never in prompt templates (style guide rule) |

---

## Prompt Injection Test Results

Automated: `backend/tests/security/prompt-injection.test.ts`

| Attack vector | Detected |
|---------------|----------|
| Ignore previous instructions | ✅ |
| Reveal system prompt | ✅ |
| Return API keys | ✅ |
| SQL in transcript | ✅ (delimiter + no DB path) |
| Benign meeting queries | ✅ Not flagged |

---

## Production Recommendations

1. Set `OBSERVABILITY_API_KEY` and block `/observability/*` admin routes at ingress except `/metrics` from scraper IP
2. Enable `WORKSPACE_DAILY_TOKEN_BUDGET` enforcement monitoring
3. Rotate `JWT_*_SECRET` via secrets manager
4. Run quarterly prompt injection eval with fixture adversarial cases
5. RS256 JWT when splitting services (per security-architecture.md v2)
