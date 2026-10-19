import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import apiRouter from './routes/api.ts';
import { initStore } from './database/store.ts';
import { config } from './config.ts';
import { globalRateLimiter } from './middleware/rateLimiter.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { logger } from './utils/logger.ts';

export function createExpressApp() {
  const app = express();

  // Trust first proxy (Cloud Run, load balancers, dev proxies)
  app.set('trust proxy', 1);

  // Initialize in-memory store
  initStore();

  // Security Middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  app.use(cors({
    origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
    credentials: true
  }));

  app.use(cookieParser());

  // Body limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Global rate limiter for API
  app.use('/api', globalRateLimiter);

  // Request logger
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
  });

  // Mount API router
  app.use('/api', apiRouter);

  // Error handler
  app.use('/api', errorHandler);

  return app;
}
