import express from 'express';
import { createLineWebhookController } from './controllers/line.controller.js';
import { createErrorMiddleware } from './middlewares/error.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { createLineWebhookRouter } from './routes/line.webhook.js';

export function createApp({ lineConfig, logger }) {
  const app = express();
  const lineWebhookController = createLineWebhookController({ logger });

  app.get('/health', (_request, response) => response.status(200).json({ status: 'ok' }));
  app.use('/webhook/line', createLineWebhookRouter({ lineConfig, lineWebhookController }));
  app.use(notFoundMiddleware);
  app.use(createErrorMiddleware({ logger }));

  return app;
}
