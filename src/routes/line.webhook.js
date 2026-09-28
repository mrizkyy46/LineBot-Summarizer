import { middleware } from '@line/bot-sdk';
import { Router } from 'express';

export function createLineWebhookRouter({ lineConfig, lineWebhookController }) {
  const router = Router();
  router.post('/', middleware(lineConfig), lineWebhookController);
  return router;
}
