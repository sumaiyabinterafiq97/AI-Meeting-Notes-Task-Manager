# Observability Tests

Jest tests live in `backend/tests/unit/observability/` (project `roots` config).

```bash
npm test -- --testPathPatterns="observability"
```

Coverage areas: metrics, cost, cache, latency, retry, rate-limit, alerts, load simulation.
