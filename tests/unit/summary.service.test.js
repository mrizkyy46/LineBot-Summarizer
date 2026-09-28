import { describe, expect, it, vi } from 'vitest';
import { createSummaryService } from '../../src/services/summary.service.js';

describe('summary service', () => {
  it('does not call the LLM for an empty group', async () => {
    const llmService = { generateSummary: vi.fn() };
    const service = createSummaryService({ llmService });

    await expect(service.generateSummary([])).resolves.toEqual({ status: 'empty' });
    expect(llmService.generateSummary).not.toHaveBeenCalled();
  });

  it('formats the supplied message collection before using the LLM', async () => {
    const messages = [
      { groupId: 'Cgroup', userId: 'U1', displayName: 'Andi', text: 'lama', timestamp: Date.UTC(2026, 8, 28, 7, 0) },
      { groupId: 'Cgroup', userId: 'U2', displayName: 'Budi', text: 'baru', timestamp: Date.UTC(2026, 8, 28, 7, 1) },
    ];
    const llmService = { generateSummary: vi.fn().mockResolvedValue('ringkasan') };
    const service = createSummaryService({ llmService });

    await expect(service.generateSummary(messages)).resolves.toEqual({ status: 'generated', summary: 'ringkasan' });
    expect(llmService.generateSummary).toHaveBeenCalledWith('[2026-09-28 14:00] Andi:\nlama\n\n[2026-09-28 14:01] Budi:\nbaru');
  });
});
