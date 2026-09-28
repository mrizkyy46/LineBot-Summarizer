import { lineEventSchema } from '../schemas/line-event.schema.js';
import { parseCommand } from '../commands/command-parser.js';

export function createLineWebhookController({ logger, messageStore, summaryCommand, lineService }) {
  return async function handleLineWebhook(request, response) {
    const events = Array.isArray(request.body?.events) ? request.body.events : [];
    logger.info({ event: 'webhook_received', eventCount: events.length });

    for (const event of events) {
      const parsedEvent = lineEventSchema.safeParse(event);

      if (!parsedEvent.success) {
        logger.warn({ event: 'webhook_event_ignored', reason: 'invalid_shape' });
        continue;
      }

      const value = parsedEvent.data;
      if (
        value.type !== 'message' ||
        value.message?.type !== 'text' ||
        value.source?.type !== 'group' ||
        !value.source.groupId ||
        !value.source.userId
      ) {
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

      const command = parseCommand(value.message.text ?? '');
      if (command?.name === 'summary') {
        await summaryCommand.execute({ groupId: value.source.groupId, replyToken: value.replyToken });
        continue;
      }

      let displayName = value.source.userId;
      try {
        displayName = await lineService.getGroupMemberDisplayName(value.source.groupId, value.source.userId);
      } catch (error) {
        logger.warn({ event: 'sender_profile_unavailable', groupId: value.source.groupId, userId: value.source.userId, error: error.message });
      }

      messageStore.saveMessage({
        lineMessageId: value.message.id,
        groupId: value.source.groupId,
        userId: value.source.userId,
        displayName,
        messageType: value.message.type,
        text: value.message.text,
        timestamp: value.timestamp ?? Date.now(),
      });
      logger.info({ event: 'message_stored', groupId: value.source.groupId, messageId: value.message.id });
    }

    return response.status(200).json({ ok: true });
  };
}
