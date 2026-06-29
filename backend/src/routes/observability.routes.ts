import { Router, Request, Response } from 'express';
import {
  dashboardMetricsService,
  metricsService,
  performanceAnalyzerService,
  alertService,
} from '../modules/observability';
import { requireObservabilityAdmin } from '../middlewares/observability-auth';

const router = Router();

router.get('/metrics', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(metricsService.exportPrometheus());
});

router.use(requireObservabilityAdmin);

router.get('/metrics/json', (_req: Request, res: Response) => {
  res.json(metricsService.getSnapshot());
});

router.get('/dashboard', async (req: Request, res: Response) => {
  const workspaceId = req.query.workspaceId as string | undefined;
  const snapshot = await dashboardMetricsService.getSnapshot(workspaceId);
  res.json(snapshot);
});

router.get('/optimization', (_req: Request, res: Response) => {
  res.json({ insights: performanceAnalyzerService.analyze() });
});

router.post('/alerts/evaluate', async (req: Request, res: Response) => {
  const workspaceId = req.body?.workspaceId as string | undefined;
  const alerts = await alertService.evaluate(workspaceId);
  res.json({ alerts });
});

export { router as observabilityRoutes };
