import { describe, expect, it, vi } from 'vitest';
import { createOpenAiCompatibleProvider, LlmProviderError } from '../src/llm/providerAdapter.js';

const config = { apiKey: 'test-key', model: 'test-model', baseUrl: 'https://llm.example/v1/' };

function fakeFetch(response: { status?: number; body?: unknown; throws?: boolean }) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    if (response.throws) throw new TypeError('fetch failed');
    return new Response(JSON.stringify(response.body ?? {}), {
      status: response.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
}

const signal = () => new AbortController().signal;

describe('providerAdapter (OpenAI-compatible, mocked fetch)', () => {
  it('posts a JSON-mode chat completion with temperature 0.1 and bounded tokens', async () => {
    const fetchImpl = fakeFetch({
      body: { model: 'test-model-0613', choices: [{ message: { content: '{"a":1}' } }] },
    });
    const provider = createOpenAiCompatibleProvider(config, fetchImpl as unknown as typeof fetch);

    const result = await provider.complete({ system: 'SYS', user: 'USER', signal: signal() });

    expect(result).toEqual({ content: '{"a":1}', model: 'test-model-0613' });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://llm.example/v1/chat/completions');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    const body = JSON.parse(String(init!.body));
    expect(body).toMatchObject({
      model: 'test-model',
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'SYS' },
        { role: 'user', content: 'USER' },
      ],
    });
    expect(body.temperature).toBeLessThanOrEqual(0.2);
  });

  it('falls back to the configured model name', async () => {
    const fetchImpl = fakeFetch({ body: { choices: [{ message: { content: '{}' } }] } });
    const provider = createOpenAiCompatibleProvider(config, fetchImpl as unknown as typeof fetch);
    expect((await provider.complete({ system: '', user: '', signal: signal() })).model).toBe('test-model');
  });

  it('maps HTTP errors to a category and status without the provider body', async () => {
    const fetchImpl = fakeFetch({ status: 401, body: { error: 'bad key sk-SECRET' } });
    const provider = createOpenAiCompatibleProvider(config, fetchImpl as unknown as typeof fetch);
    const error = await provider.complete({ system: '', user: '', signal: signal() }).catch((e) => e);
    expect(error).toBeInstanceOf(LlmProviderError);
    expect(error).toMatchObject({ category: 'http', status: 401 });
    expect(String(error.message)).not.toContain('SECRET');
  });

  it('maps network failures and malformed payloads', async () => {
    const net = createOpenAiCompatibleProvider(config, fakeFetch({ throws: true }) as unknown as typeof fetch);
    await expect(net.complete({ system: '', user: '', signal: signal() })).rejects.toMatchObject({
      category: 'network',
    });
    const bad = createOpenAiCompatibleProvider(
      config,
      fakeFetch({ body: { choices: [] } }) as unknown as typeof fetch,
    );
    await expect(bad.complete({ system: '', user: '', signal: signal() })).rejects.toMatchObject({
      category: 'bad_response',
    });
  });

  it('reports an aborted request as aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const provider = createOpenAiCompatibleProvider(config, fakeFetch({ throws: true }) as unknown as typeof fetch);
    await expect(
      provider.complete({ system: '', user: '', signal: controller.signal }),
    ).rejects.toMatchObject({ category: 'aborted' });
  });
});
