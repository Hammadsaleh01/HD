import 'dotenv/config';
import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { createExpressApp } from './backend/src/app.ts';
import { config } from './backend/src/config.ts';
import { logger } from './backend/src/utils/logger.ts';

async function startServer() {
  const app = createExpressApp();
  const PORT = config.port;

  // Vite development middleware vs production static files
  if (config.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Fallback error handler for non-API requests
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled server error', err);
    if (!res.headersSent) {
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal Server Error' } });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` PlateShare Backend Running on http://0.0.0.0:${PORT}`);
    console.log(` Environment: ${config.nodeEnv}`);
    console.log(` Payment Mode: ${config.paymentMode}`);
    console.log(`====================================================`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start PlateShare server:', error);
});

export default startServer;
