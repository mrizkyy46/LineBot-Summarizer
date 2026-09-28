import { lineEventSchema } from '../schemas/line-event.schema.js';

export function createLineWebhookController({ logger }) {
  return function handleLineWebhook(request, response) {
    const events = Array.isArray(request.body?.events) ? request.body.events : [];
    logger.info({ event: 'webhook_received', eventCount: events.length });

    for (const event of events) {
      const parsedEvent = lineEventSchema.safeParse(event);

      if (!parsedEvent.success) {
        logger.warn({ event: 'webhook_event_ignored', reason: 'invalid_shape' });
        continue;
      }

      const value = parsedEvent.data;
      if (value.type !== 'message' || value.message?.type !== 'text') {
        logger.info({ event: 'webhook_event_ignored', reason: 'unsupported_event' });
        continue;
      }

      logger.info({
        event: 'message_received',
        groupId: value.source?.type === 'group' ? value.source.groupId : undefined,
        userId: value.source?.userId,
        messageId: value.message.id,
        messageType: value.message.type,
        textLength: value.message.text?.length ?? 0,
      });
    }

    return response.status(200).json({ ok: true });
  };
}
