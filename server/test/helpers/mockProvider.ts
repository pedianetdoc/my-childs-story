import { vi } from 'vitest';
import type { ChatRequest, ChatResult, LlmProvider } from '../../src/llm/providerAdapter.js';

export type MockProvider = LlmProvider & { calls: ChatRequest[] };

/** Mocked LLM — tests never call a real provider. */
export function mockProvider(
  respond: (request: ChatRequest) => Promise<ChatResult> | ChatResult,
): MockProvider {
  const calls: ChatRequest[] = [];
  return {
    model: 'mock-model',
    calls,
    complete: vi.fn(async (request: ChatRequest) => {
      calls.push(request);
      return respond(request);
    }),
  };
}

export function jsonProvider(body: unknown, model = 'mock-model-2026'): MockProvider {
  return mockProvider(() => ({ content: JSON.stringify(body), model }));
}

/** Never resolves on its own; rejects when the request is aborted. */
export function hangingProvider(): MockProvider {
  return mockProvider(
    ({ signal }) =>
      new Promise<ChatResult>((_, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')));
      }),
  );
}
