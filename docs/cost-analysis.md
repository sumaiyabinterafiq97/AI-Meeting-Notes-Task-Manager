# Cost Analysis — MeetingMind AI

**Version:** 1.0  
**Module:** `backend/src/modules/observability/cost-tracking/`

---

## 1. Cost Model

Cost is estimated at invocation time using configurable per-model pricing:

```
estimated_cost_usd = (prompt_tokens × input_rate) + (completion_tokens × output_rate) + (embedding_tokens × embed_rate)
```

Rates are defined in `provider-pricing.ts` (USD per 1M tokens).

---

## 2. Supported Providers

| Provider | Models | Pricing Source |
|----------|--------|----------------|
| OpenAI | gpt-4o, gpt-4o-mini, text-embedding-3-small | `PROVIDER_MODEL_PRICING` |
| Anthropic | claude-3-5-sonnet, claude-3-5-haiku | `PROVIDER_MODEL_PRICING` |
| Google/Gemini | gemini-1.5-flash, gemini-1.5-pro, text-embedding-004 | `PROVIDER_MODEL_PRICING` |
| Local/Mock | All | $0 (self-hosted) |

New providers: register pricing via `costTrackerService.registerModelPricing()`.

---

## 3. Cost Dimensions

| Dimension | Storage | API |
|-----------|---------|-----|
| Per request | `llm_invocations.estimated_cost_usd` | TokenUsageService.record() |
| Per workspace/day | `llm_usage_daily` | CostReportService.getWorkspaceDailyCost() |
| Per workspace/month | Aggregated from daily | CostReportService.getWorkspaceMonthlyCost() |
| Per provider | Aggregated from invocations | CostReportService.getCostByProvider() |
| Platform leaderboard | Top workspaces by cost | CostReportService.getCostLeaderboard() |
| Trends | Daily cost over N days | CostReportService.getCostTrend() |

---

## 4. Cost Optimization Strategies

| Strategy | Expected Savings | Tracking |
|----------|------------------|----------|
| Response caching | 10–30% | `cache.hit` metric |
| Model routing (mini for chat) | 40–60% | Per-model cost breakdown |
| Embedding batching | ~50% API calls | `embedding.generated` events |
| Context compression | 10–20% tokens | `context.tokens` gauge |
| Mock in CI | 100% | `AI_USE_MOCK=true` |

Savings tracked via `performanceAnalyzerService.trackSavings()`.

---

## 5. Alerts

| Alert | Threshold (default) | Severity |
|-------|---------------------|----------|
| High daily cost | $50/workspace/day | High |
| Excessive tokens | 400k tokens/day | High |
| Provider outage | Any outage event | Critical |

Configure: `ALERT_SLACK_WEBHOOK_URL`, `ALERT_EMAIL_TO`

---

## 6. Reports

```typescript
// Workspace token + cost report
const report = await tokenUsageService.generateReport(workspaceId, 'month');

// Cost leaderboard (platform admin)
const top = await costReportService.getCostLeaderboard(10, 7);
```

---

## 7. QA Validation (2026-06-22)

| Check | Result |
|-------|--------|
| Cost tracking module | ✅ Implemented (`CostTrackerService`, `llm_invocations`) |
| Mock CI cost | $0 (`AI_USE_MOCK=true`) |
| Embedding cost estimate | ✅ Logged per batch (`estimatedCostUsd`) |
| Workspace budget | ✅ `WORKSPACE_DAILY_TOKEN_BUDGET` enforced in `TokenMonitorService` |
| Production baseline | ⚠️ Not captured — run 7-day staging burn-in |
| Optimization tracking | ✅ `performanceAnalyzerService.trackSavings()` |

**Estimated mock meeting processing cost (single job, all agents):** ~$0.000003 embed + $0 LLM (mock)

**Production estimate (gpt-4o-mini, typical 30-min meeting):** ~$0.02–0.08 per extraction pipeline (per architecture review; validate with `llm_invocations` after staging).

See [qa-report.md](./qa-report.md) and [release-readiness-checklist.md](./release-readiness-checklist.md).
