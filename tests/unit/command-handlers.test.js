import { describe, expect, it, vi } from 'vitest';
import { createSummaryCommand } from '../../src/commands/summary.command.js';
import { parseCommand } from '../../src/commands/command-parser.js';
import { createMessageStore } from '../../src/services/message-store.service.js';

const msg = (timestamp, text = 'chat', groupId = 'C1') => ({ groupId, userId: 'U1', displayName: 'Andi', text, timestamp });

function setup() {
  const messageStore = createMessageStore({ maxMessagesPerGroup: 3 });
  const summaryService = { generateSummary: vi.fn().mockResolvedValue({ status: 'generated', summary: 'hasil' }) };
  const lineService = { replyText: vi.fn().mockResolvedValue() };
  const logger = { info: vi.fn(), error: vi.fn() };
  const handler = createSummaryCommand({ messageStore, summaryService, lineService, logger, maxSummaryMessages: 2, maxMessagesPerGroup: 3, now: () => new Date('2026-09-28T10:00:00Z') });
  return { messageStore, summaryService, lineService, handler };
}

async function run(handler, command) {
  await handler.execute({ command: parseCommand(command), groupId: 'C1', replyToken: 'reply' });
}

describe('command handlers', () => {
  it('summarizes only the selected group and applies recent message limit', async () => {
    const { messageStore, summaryService, lineService, handler } = setup();
    messageStore.saveMessage(msg(Date.parse('2026-09-28T08:00:00Z'), 'old'));
    messageStore.saveMessage(msg(Date.parse('2026-09-28T09:30:00Z'), 'new'));
    messageStore.saveMessage(msg(Date.parse('2026-09-28T09:45:00Z'), 'other group', 'C2'));
    await run(handler, '/summary');
    expect(summaryService.generateSummary).toHaveBeenCalledWith([expect.objectContaining({ text: 'old' }), expect.objectContaining({ text: 'new' })]);
    expect(lineService.replyText).toHaveBeenCalledWith('reply', 'hasil');
  });

  it('filters today by Asia/Jakarta and does not call LLM when empty', async () => {
    const { messageStore, summaryService, lineService, handler } = setup();
    messageStore.saveMessage(msg(Date.parse('2026-09-27T16:59:00Z'), 'yesterday'));
    messageStore.saveMessage(msg(Date.parse('2026-09-27T17:00:00Z'), 'today start'));
    await run(handler, '/summary today');
    expect(summaryService.generateSummary).toHaveBeenCalledWith([expect.objectContaining({ text: 'today start' })]);
    await run(handler, '/summary 3h');
    expect(lineService.replyText).toHaveBeenLastCalledWith('reply', 'Tidak ada percakapan pada periode tersebut yang dapat dirangkum.');
    expect(summaryService.generateSummary).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['/summary 1h', '2026-09-28T09:30:00Z'],
    ['/summary 3h', '2026-09-28T08:00:00Z'],
    ['/summary yesterday', '2026-09-27T10:00:00Z'],
    ['/summary 2026-09-28', '2026-09-28T08:00:00Z'],
    ['/summary 2026-09-28 14:00-18:00', '2026-09-28T08:00:00Z'],
  ])('filters messages for %s in Asia/Jakarta', async (command, timestamp) => {
    const { messageStore, summaryService, handler } = setup();
    messageStore.saveMessage(msg(Date.parse(timestamp)));
    await run(handler, command);
    expect(summaryService.generateSummary).toHaveBeenCalledWith([expect.objectContaining({ timestamp: Date.parse(timestamp) })]);
  });

  it('reports status, clears only the active group, and provides help', async () => {
    const { messageStore, lineService, handler } = setup();
    messageStore.saveMessage(msg(10));
    messageStore.saveMessage(msg(11, 'private other', 'C2'));
    await run(handler, '/status');
    expect(lineService.replyText.mock.lastCall[1]).toContain('Stored messages: 1');
    expect(lineService.replyText.mock.lastCall[1]).not.toContain('API_KEY');
    await run(handler, '/clear');
    expect(messageStore.getMessageCount('C1')).toBe(0);
    expect(messageStore.getMessageCount('C2')).toBe(1);
    expect(lineService.replyText.mock.lastCall[1]).toContain('dibersihkan');
    await run(handler, '/help');
    expect(lineService.replyText.mock.lastCall[1]).toContain('/summary yesterday');
  });
});
