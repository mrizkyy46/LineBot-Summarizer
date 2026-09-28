import { describe, expect, it, vi } from 'vitest';

import { createGroqLlmService } from '../../src/services/llm.service.js';

const okResponse = (content) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }] }) });
const errorResponse = (status) => ({ ok: false, status });

function serviceWith(fetchImpl, overrides = {}) {
  return createGroqLlmService({
    apiKey: 'never-log-this',
    model: 'openai/gpt-oss-20b',
    timeoutMs: 100,
    fetchImpl,
    sleep: vi.fn().mockResolvedValue(undefined),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...overrides,
  });
}

describe('Groq LLM service', () => {
  it('sends the configured model and prompt, then returns response text', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse('  ringkasan Groq  '));
    const service = serviceWith(fetchImpl);
    await expect(service.generateSummary('[2026-09-28 14:10] Andi:\nhalo')).resolves.toBe('ringkasan Groq');
    const [, request] = fetchImpl.mock.calls[0];
    expect(request.headers.Authorization).toBe('Bearer never-log-this');
    expect(JSON.parse(request.body)).toMatchObject({ model: 'openai/gpt-oss-20b' });
  });

  it('rejects empty and malformed Groq responses safely', async () => {
    await expect(serviceWith(vi.fn().mockResolvedValue(okResponse('  '))).generateSummary('chat'))
      .rejects.toMatchObject({ name: 'LlmServiceError', type: 'malformed_response' });
    await expect(serviceWith(vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })).generateSummary('chat'))
      .rejects.toMatchObject({ name: 'LlmServiceError', type: 'malformed_response' });
  });

  it.each([400, 401, 403, 404])('does not retry HTTP %s', async (status) => {
    const fetchImpl = vi.fn().mockResolvedValue(errorResponse(status));
    await expect(serviceWith(fetchImpl).generateSummary('chat')).rejects.toMatchObject({ status });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([429, 503])('retries transient HTTP %s with exponential backoff', async (status) => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(errorResponse(status))
      .mockResolvedValueOnce(errorResponse(status))
      .mockResolvedValueOnce(okResponse('done'));
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(serviceWith(fetchImpl, { sleep }).generateSummary('chat')).resolves.toBe('done');
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000]);
  });

  it('stops after the bounded retries and safely rejects', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(errorResponse(503));
    const sleep = vi.fn().mockResolvedValue(undefined);
    await expect(serviceWith(fetchImpl, { sleep }).generateSummary('chat')).rejects.toMatchObject({ status: 503 });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000, 4000]);
  });

  it('handles timeout without leaking provider details', async () => {
    const fetchImpl = vi.fn((_url, { signal }) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    await expect(serviceWith(fetchImpl, { timeoutMs: 1 }).generateSummary('chat'))
      .rejects.toMatchObject({ message: 'LLM request timed out', type: 'timeout' });
  });

  it('does not put API key or conversation in structured logs', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    await serviceWith(vi.fn().mockResolvedValue(errorResponse(401)), { logger }).generateSummary('private message').catch(() => {});
    const logs = JSON.stringify(logger);
    expect(logs).not.toContain('never-log-this');
    expect(logs).not.toContain('private message');
  });
});
