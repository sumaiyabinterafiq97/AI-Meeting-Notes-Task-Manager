import dotenv from 'dotenv';
import path from 'path';
import { createApp } from './app';
import { env, connectDatabase, disconnectDatabase } from './config';

// Root .env (monorepo) then backend/.env overrides
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = createApp();

async function startServer(): Promise<void> {
  try {
    try {
      await connectDatabase();
      console.log('Database connected');
    } catch (dbError) {
      if (env.NODE_ENV === 'production') {
        throw dbError;
      }
      console.warn('\n⚠  Database not available — API starting in degraded mode.');
      console.warn('   1. Start Docker Desktop');
      console.warn('   2. Run: docker compose up postgres -d');
      console.warn('   3. Run: cd backend && npx prisma migrate deploy\n');
    }

    const server = app.listen(env.API_PORT, () => {
      console.log(`API server running on http://localhost:${env.API_PORT} [${env.NODE_ENV}]`);
      console.log(`Health check: http://localhost:${env.API_PORT}/health`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDatabase();
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
