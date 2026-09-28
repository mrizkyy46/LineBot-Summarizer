import { createHmac } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';

const secret = 'test-channel-secret';
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const app = createApp({ lineConfig: { channelSecret: secret }, logger });

function signatureFor(body) {
  return createHmac('sha256', secret).update(body).digest('base64');
}

describe('POST /webhook/line', () => {
  it('accepts a signed text-message event and logs only metadata', async () => {
    const body = JSON.stringify({
      events: [
        {
          type: 'message',
          timestamp: 1_790_595_600_000,
          source: { type: 'group', groupId: 'Cgroup', userId: 'Uuser' },
          message: { id: 'message-1', type: 'text', text: 'private conversation' },
        },
      ],
    });

    const response = await request(app)
      .post('/webhook/line')
      .set('Content-Type', 'application/json')
      .set('X-Line-Signature', signatureFor(body))
      .send(body);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'message_received',
        groupId: 'Cgroup',
        userId: 'Uuser',
        messageId: 'message-1',
        messageType: 'text',
        textLength: 20,
      }),
    );
    expect(logger.info).not.toHaveBeenCalledWith(expect.objectContaining({ text: 'private conversation' }));
  });

  it('rejects requests with an invalid signature', async () => {
    const response = await request(app)
      .post('/webhook/line')
      .set('Content-Type', 'application/json')
      .set('X-Line-Signature', 'invalid')
      .send(JSON.stringify({ events: [] }));

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('ignores supported-shape events outside the text-message scope', async () => {
    const body = JSON.stringify({ events: [{ type: 'follow', source: { type: 'user', userId: 'Uuser' } }] });
    const response = await request(app)
      .post('/webhook/line')
      .set('Content-Type', 'application/json')
      .set('X-Line-Signature', signatureFor(body))
      .send(body);

    expect(response.status).toBe(200);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'webhook_event_ignored', reason: 'unsupported_event' }),
    );
  });
});
