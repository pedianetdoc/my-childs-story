import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { CATEGORY_KEYS } from '@my-childs-story/shared';
import { createApp } from '../src/app.js';

describe('server scaffold (placeholder)', () => {
  it('responds to GET /api/health', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('serves the built client with an SPA fallback when a dist dir is given', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcs-client-'));
    fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>test</title>');
    const app = createApp({ clientDistDir: dir });

    const res = await request(app).get('/some/client/route');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>test</title>');

    const apiMiss = await request(app).get('/api/unknown');
    expect(apiMiss.status).toBe(404);
  });

  it('can import shared category constants', () => {
    expect(CATEGORY_KEYS).toHaveLength(10);
  });
});
