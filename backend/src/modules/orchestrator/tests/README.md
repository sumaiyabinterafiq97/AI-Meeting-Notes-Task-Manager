# Orchestrator tests

Unit tests live in `backend/tests/unit/orchestrator/`:

- `orchestrator-module.test.ts` — registry, workflows, reducers, retry, circuit breaker, checkpoints, events
- `merge-node.test.ts` — partial failure / critical agent failure
- `workflow-integration.test.ts` — pipeline → orchestrator delegation

Run: `npm test -- tests/unit/orchestrator`
