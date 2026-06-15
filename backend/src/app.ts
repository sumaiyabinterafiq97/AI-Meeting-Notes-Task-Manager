import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { corsOptions } from './config/cors';
import { apiV1Routes } from './routes';
import { healthRoutes } from './routes/health.routes';
import { errorHandler, notFoundHandler, requestIdMiddleware } from './middlewares';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(requestIdMiddleware);
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  app.use('/health', healthRoutes);
  app.use('/api/v1', apiV1Routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
