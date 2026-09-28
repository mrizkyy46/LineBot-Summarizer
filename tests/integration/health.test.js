import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';

const logger = { info() {}, warn() {}, error() {} };
const app = createApp({ lineConfig: { channelSecret: 'test-secret' }, logger });

describe('GET /health', () => {
  it('returns an availability response', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
