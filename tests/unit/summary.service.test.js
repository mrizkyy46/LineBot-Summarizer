import { describe, expect, it, vi } from 'vitest';
import { createMessageStore } from '../../src/services/message-store.service.js';
import { createSummaryService } from '../../src/services/summary.service.js';

describe('summary service', () => {
  it('does not call the LLM for an empty group', async () => {
    const llmService = { generateSummary: vi.fn() };
    const service = createSummaryService({ messageStore: createMessageStore(), llmService });

    await expect(service.generateSummary('Cgroup')).resolves.toEqual({ status: 'empty' });
    expect(llmService.generateSummary).not.toHaveBeenCalled();
  });

  it('formats only the configured number of recent messages before using the LLM', async () => {
    const store = createMessageStore();
    store.saveMessage({ groupId: 'Cgroup', userId: 'U1', displayName: 'Andi', text: 'lama', timestamp: Date.UTC(2026, 8, 28, 7, 0) });
    store.saveMessage({ groupId: 'Cgroup', userId: 'U2', displayName: 'Budi', text: 'baru', timestamp: Date.UTC(2026, 8, 28, 7, 1) });
    const llmService = { generateSummary: vi.fn().mockResolvedValue('ringkasan') };
    const service = createSummaryService({ messageStore: store, llmService, maxSummaryMessages: 1 });

    await expect(service.generateSummary('Cgroup')).resolves.toEqual({ status: 'generated', summary: 'ringkasan' });
    expect(llmService.generateSummary).toHaveBeenCalledWith('[2026-09-28 14:01] Budi:\nbaru');
  });
});
