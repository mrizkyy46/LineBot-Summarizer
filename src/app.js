import express from 'express';
import { loadEnvironment } from './config/env.js';
import { createLineConfig } from './config/line.js';
import { createLineWebhookController } from './controllers/line.controller.js';
import { createSummaryCommand } from './commands/summary.command.js';
import { createErrorMiddleware } from './middlewares/error.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { createLineWebhookRouter } from './routes/line.webhook.js';
import { createLogger } from './utils/logger.js';
import { createMessageStore } from './services/message-store.service.js';
import { createSummaryService } from './services/summary.service.js';
import { createUnavailableLlmService } from './services/llm.service.js';
import { createLineService } from './services/line.service.js';

export function createApp({ lineConfig, logger, messageStore, summaryCommand, summaryService, lineService, maxMessagesPerGroup, maxSummaryMessages }) {
  const app = express();
  const store = messageStore ?? createMessageStore({ maxMessagesPerGroup });
  const summaries = summaryService ?? createSummaryService({
    messageStore: store,
    llmService: createUnavailableLlmService(),
    maxSummaryMessages,
  });
  const replies = lineService ?? createLineService({ channelAccessToken: lineConfig.channelAccessToken });
  const command = summaryCommand ?? createSummaryCommand({ summaryService: summaries, lineService: replies, logger });
  const lineWebhookController = createLineWebhookController({
    logger,
    messageStore: store,
    summaryCommand: command,
    lineService: replies,
  });

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
    vercelApp = createApp({
      lineConfig: createLineConfig(env),
      logger: createLogger(),
      maxMessagesPerGroup: env.MAX_MESSAGES_PER_GROUP,
      maxSummaryMessages: env.MAX_SUMMARY_MESSAGES,
    });
  }

  return vercelApp;
}

export default function vercelHandler(request, response, next) {
  return getVercelApp()(request, response, next);
}
