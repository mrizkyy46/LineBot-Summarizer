import { describe, expect, it, vi } from 'vitest';

import { createGeminiLlmService } from '../../src/services/llm.service.js';

describe('Gemini LLM service', () => {
  it('sends the formatted prompt to Gemini and returns its text response', async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: '  ringkasan Gemini  ' });
    const service = createGeminiLlmService({
      apiKey: 'not-logged',
      model: 'gemini-test',
      timeoutMs: 100,
      client: { models: { generateContent } },
    });

    await expect(service.generateSummary('[2026-09-28 14:10] Andi:\nhalo')).resolves.toBe('ringkasan Gemini');
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-test',
      contents: expect.stringContaining('Ringkas HANYA percakapan'),
    }));
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({
      contents: expect.stringContaining('[2026-09-28 14:10] Andi:\nhalo'),
    }));
  });

  it('returns a safe service error when Gemini rejects the request', async () => {
    const service = createGeminiLlmService({
      model: 'gemini-test',
      timeoutMs: 100,
      client: { models: { generateContent: vi.fn().mockRejectedValue(new Error('provider detail')) } },
    });

    await expect(service.generateSummary('percakapan')).rejects.toEqual(expect.objectContaining({
      name: 'LlmServiceError',
      message: 'LLM request failed',
    }));
  });

  it('fails with a timeout when Gemini does not respond in time', async () => {
    const service = createGeminiLlmService({
      model: 'gemini-test',
      timeoutMs: 1,
      client: { models: { generateContent: vi.fn().mockImplementation(() => new Promise(() => {})) } },
    });

    await expect(service.generateSummary('percakapan')).rejects.toThrow('LLM request timed out');
  });
});
