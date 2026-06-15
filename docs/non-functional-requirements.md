# Non-Functional Requirements

**Product:** AI Meeting Notes & Task Manager  
**Version:** 1.1  
**Status:** Approved for Implementation  
**Related:** [functional-requirements.md](./functional-requirements.md) · [security-architecture.md](./security-architecture.md) · [scalability-design.md](./scalability-design.md)

---

## 1. Performance

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-PERF-001 | API response time (excl. AI) | p95 < 300ms | APM / load test |
| NFR-PERF-002 | API response time (dashboard) | p95 < 500ms | APM |
| NFR-PERF-003 | AI job completion | p95 < 60s for ≤ 50k char transcript | Job metrics |
| NFR-PERF-004 | Frontend initial load (LCP) | < 2.5s on 4G | Lighthouse |
| NFR-PERF-005 | Kanban board render | < 1s for 500 tasks | Manual / RUM |
| NFR-PERF-006 | Search results | < 400ms p95 | APM |
| NFR-PERF-007 | Database connection pool | Max 20 connections per API instance | Neon pooling |

---

## 2. Security

| ID | Requirement | Detail |
|----|-------------|--------|
| NFR-SEC-001 | Transport encryption | TLS 1.2+ everywhere |
| NFR-SEC-002 | Authentication | JWT + rotating refresh tokens; see [security-architecture.md](./security-architecture.md) |
| NFR-SEC-003 | Authorization | RBAC enforced at middleware + service layer |
| NFR-SEC-004 | Tenant isolation | Every query scoped by `workspace_id` + membership |
| NFR-SEC-005 | Input validation | Zod on all request bodies; max payload 10MB |
| NFR-SEC-006 | Rate limiting | Per-IP and per-user; see API architecture |
| NFR-SEC-007 | Secrets | Env vars only; never in repo; rotate quarterly |
| NFR-SEC-008 | OWASP Top 10 | Mitigations documented in security architecture |
| NFR-SEC-009 | Dependency scanning | Dependabot / Snyk in CI |
| NFR-SEC-010 | AI data handling | Transcripts sent to OpenAI; document in privacy policy |

---

## 3. Scalability

| ID | Requirement | MVP | Scale Target (12 mo) |
|----|-------------|-----|----------------------|
| NFR-SCALE-001 | API instances | 1 | 3+ horizontal |
| NFR-SCALE-002 | Workspaces | 100 | 10,000 |
| NFR-SCALE-003 | Users per workspace | 50 | 200 |
| NFR-SCALE-004 | Meetings per workspace | 1,000 | 10,000 |
| NFR-SCALE-005 | Tasks per workspace | 500 | 5,000 |
| NFR-SCALE-006 | Concurrent AI jobs | 5/workspace | Queue-based unlimited |
| NFR-SCALE-007 | Stateless API | Required | Required |

See [scalability-design.md](./scalability-design.md) for implementation strategy.

---

## 4. Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-REL-001 | API uptime | 99.5% monthly |
| NFR-REL-002 | AI job success rate | ≥ 95% after retries |
| NFR-REL-003 | AI job retries | 3x exponential backoff |
| NFR-REL-004 | Idempotent mutations | Task creation, invitation accept |
| NFR-REL-005 | Graceful degradation | AI unavailable → queue + user message |
| NFR-REL-006 | Database backups | Daily PITR (Neon production) |
| NFR-REL-007 | RTO / RPO | RTO 4h, RPO 1h (production) |

---

## 5. Availability

| ID | Requirement | Detail |
|----|-------------|--------|
| NFR-AVAIL-001 | Health checks | `/health` liveness + DB probe |
| NFR-AVAIL-002 | Zero-downtime deploy | Rolling deploy on Railway/Render |
| NFR-AVAIL-003 | Readiness probe | Fail if DB unreachable |
| NFR-AVAIL-004 | Maintenance windows | Announced; off-peak preferred |

---

## 6. Accessibility

| ID | Requirement | Standard |
|----|-------------|----------|
| NFR-A11Y-001 | WCAG compliance | 2.1 Level AA |
| NFR-A11Y-002 | Keyboard navigation | All interactive elements |
| NFR-A11Y-003 | Screen reader | ARIA labels on Shadcn components |
| NFR-A11Y-004 | Color contrast | ≥ 4.5:1 text; ≥ 3:1 UI components |
| NFR-A11Y-005 | Focus management | Visible focus rings; modal trap |

---

## 7. Maintainability

| ID | Requirement | Detail |
|----|-------------|--------|
| NFR-MAINT-001 | TypeScript | Strict mode enabled |
| NFR-MAINT-002 | Linting | ESLint + Prettier; CI enforced |
| NFR-MAINT-003 | Migrations | Prisma only; no manual prod DDL |
| NFR-MAINT-004 | API documentation | OpenAPI 3.1 spec generated from code |
| NFR-MAINT-005 | Test coverage | ≥ 70% on service layer |
| NFR-MAINT-006 | Code review | Required for all PRs |
| NFR-MAINT-007 | Shared types | `packages/shared-types` for FE/BE contracts |

---

## 8. Data Privacy & Compliance

| ID | Requirement | Detail |
|----|-------------|--------|
| NFR-PRIV-001 | Workspace isolation | Enforced at query layer |
| NFR-PRIV-002 | PII minimization | Only display names sent to AI |
| NFR-PRIV-003 | Data retention | Configurable per workspace (v2); default indefinite |
| NFR-PRIV-004 | Right to delete | User soft-delete; hard-delete on request (v2) |
| NFR-PRIV-005 | AI provider DPA | OpenAI enterprise DPA for production |

---

## 9. Observability

| ID | Requirement | Tool |
|----|-------------|------|
| NFR-OBS-001 | Error tracking | Sentry (FE + BE) |
| NFR-OBS-002 | Structured logging | JSON logs with `requestId`, `userId`, `workspaceId` |
| NFR-OBS-003 | Metrics | Request latency, error rate, AI job duration |
| NFR-OBS-004 | Alerting | Pager/email on error rate > 1% or health check fail |
| NFR-OBS-005 | Correlation ID | `X-Request-Id` header propagated FE → BE |

---

## 10. Compatibility

| ID | Requirement | Detail |
|----|-------------|--------|
| NFR-COMPAT-001 | Browsers | Chrome, Firefox, Safari, Edge (last 2 versions) |
| NFR-COMPAT-002 | Mobile web | Responsive; usable on iOS Safari / Android Chrome |
| NFR-COMPAT-003 | API versioning | `/api/v1` prefix; breaking changes → v2 |

---

## SLA Summary (Production)

| Metric | Target |
|--------|--------|
| Uptime | 99.5% |
| API p95 latency | < 300ms |
| AI processing p95 | < 60s |
| Support response (business hours) | < 24h |
| Critical bug fix | < 48h |
