import express from 'express';
import { loadEnvironment } from './config/env.js';
import { createLineConfig } from './config/line.js';
import { createLineWebhookController } from './controllers/line.controller.js';
import { createErrorMiddleware } from './middlewares/error.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { createLineWebhookRouter } from './routes/line.webhook.js';
import { createLogger } from './utils/logger.js';

export function createApp({ lineConfig, logger }) {
  const app = express();
  const lineWebhookController = createLineWebhookController({ logger });

  app.get('/health', (_request, response) => response.status(200).json({ status: 'ok' }));
  app.use('/webhook/line', createLineWebhookRouter({ lineConfig, lineWebhookController }));
  app.use(notFoundMiddleware);
  app.use(createErrorMiddleware({ logger }));

  return app;
}

let vercelApp;

function getVercelApp() {
  if (!vercelApp) {
    const env = loadEnvironment();
    vercelApp = createApp({ lineConfig: createLineConfig(env), logger: createLogger() });
  }

  return vercelApp;
}

export default function vercelHandler(request, response, next) {
  return getVercelApp()(request, response, next);
}
