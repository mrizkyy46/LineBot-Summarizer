import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import vercelHandler, { createApp } from '../../src/app.js';

const logger = { info() {}, warn() {}, error() {} };
const app = createApp({ lineConfig: { channelSecret: 'test-secret' }, logger });

describe('GET /health', () => {
  it('returns an availability response', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('exports a Vercel-compatible default request handler', async () => {
    vi.stubEnv('LINE_CHANNEL_SECRET', 'test-secret');
    vi.stubEnv('LINE_CHANNEL_ACCESS_TOKEN', 'test-access-token');
    vi.stubEnv('LLM_PROVIDER', 'groq');
    vi.stubEnv('LLM_API_KEY', 'test-groq-api-key');
    vi.stubEnv('LLM_MODEL', 'openai/gpt-oss-20b');

    const response = await request(vercelHandler).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    vi.unstubAllEnvs();
  });
});
