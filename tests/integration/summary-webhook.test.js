import { createHmac } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { createMessageStore } from '../../src/services/message-store.service.js';
import { createSummaryService } from '../../src/services/summary.service.js';

const secret = 'test-channel-secret';

function signatureFor(body) {
  return createHmac('sha256', secret).update(body).digest('base64');
}

function signedWebhook(app, event) {
  const body = JSON.stringify({ events: [event] });
  return request(app)
    .post('/webhook/line')
    .set('Content-Type', 'application/json')
    .set('X-Line-Signature', signatureFor(body))
    .send(body);
}

describe('summary webhook flow', () => {
  it('stores regular group text and replies with a generated summary for /summary', async () => {
    const messageStore = createMessageStore();
    const llmService = { generateSummary: vi.fn().mockResolvedValue('ringkasan percakapan') };
    const lineService = {
      getGroupMemberDisplayName: vi.fn().mockResolvedValue('Andi'),
      replyText: vi.fn().mockResolvedValue(),
    };
    const app = createApp({
      lineConfig: { channelSecret: secret },
      logger: { info() {}, warn() {}, error() {} },
      messageStore,
      lineService,
      summaryService: createSummaryService({ messageStore, llmService }),
    });

    await signedWebhook(app, {
      type: 'message',
      timestamp: Date.UTC(2026, 8, 28, 7, 10),
      source: { type: 'group', groupId: 'Cgroup', userId: 'Uuser' },
      message: { id: 'message-1', type: 'text', text: 'Besok deploy.' },
    }).expect(200);

    await signedWebhook(app, {
      type: 'message',
      replyToken: 'reply-token',
      timestamp: Date.UTC(2026, 8, 28, 7, 11),
      source: { type: 'group', groupId: 'Cgroup', userId: 'Uuser' },
      message: { id: 'message-2', type: 'text', text: '/summary' },
    }).expect(200);

    expect(messageStore.getMessageCount('Cgroup')).toBe(1);
    expect(llmService.generateSummary).toHaveBeenCalledWith('[2026-09-28 14:10] Andi:\nBesok deploy.');
    expect(lineService.replyText).toHaveBeenCalledWith('reply-token', 'ringkasan percakapan');
  });

  it('replies with a safe message when the LLM request fails', async () => {
    const messageStore = createMessageStore();
    messageStore.saveMessage({
      groupId: 'Cgroup',
      userId: 'Uuser',
      displayName: 'Andi',
      text: 'Pesan untuk diringkas.',
      timestamp: Date.UTC(2026, 8, 28, 7, 10),
    });
    const llmService = { generateSummary: vi.fn().mockRejectedValue(new Error('provider detail')) };
    const lineService = { replyText: vi.fn().mockResolvedValue() };
    const app = createApp({
      lineConfig: { channelSecret: secret },
      logger: { info() {}, warn() {}, error() {} },
      messageStore,
      lineService,
      summaryService: createSummaryService({ messageStore, llmService }),
    });

    await signedWebhook(app, {
      type: 'message',
      replyToken: 'reply-token',
      timestamp: Date.UTC(2026, 8, 28, 7, 11),
      source: { type: 'group', groupId: 'Cgroup', userId: 'Uuser' },
      message: { id: 'message-2', type: 'text', text: '/summary' },
    }).expect(200);

    expect(lineService.replyText).toHaveBeenCalledWith(
      'reply-token',
      'Maaf, summary sedang gagal dibuat. Silakan coba lagi beberapa saat.',
    );
  });
});
