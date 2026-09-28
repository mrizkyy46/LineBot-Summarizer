import { JSONParseError, SignatureValidationFailed } from '@line/bot-sdk';

export function createErrorMiddleware({ logger }) {
  return function errorMiddleware(error, _request, response, _next) {
    if (error instanceof SignatureValidationFailed) {
      logger.warn({ event: 'webhook_signature_rejected' });
      return response.status(401).json({ error: 'Unauthorized' });
    }

    if (error instanceof JSONParseError || error instanceof SyntaxError) {
      logger.warn({ event: 'webhook_payload_rejected' });
      return response.status(400).json({ error: 'Invalid webhook payload' });
    }

    logger.error({ event: 'request_failed', error: error.message });
    return response.status(500).json({ error: 'Internal server error' });
  };
}
