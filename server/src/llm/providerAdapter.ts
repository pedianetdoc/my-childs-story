/**
 * The ONLY module that talks to the LLM provider (OpenAI-compatible chat API).
 *
 * Never log prompts, narratives or completions here. Errors carry a category and
 * an HTTP status only — never provider response bodies.
 */
import { LLM_MAX_TOKENS, LLM_TEMPERATURE, type LlmConfig } from '../config.js';

export type ChatRequest = {
  system: string;
  user: string;
  signal: AbortSignal;
};

export type ChatResult = {
  /** Raw message content; expected to be a JSON object as text. */
  content: string;
  /** Model reported by the provider, or the configured model. */
  model: string;
};

export interface LlmProvider {
  readonly model: string;
  complete(request: ChatRequest): Promise<ChatResult>;
}

export type LlmErrorCategory = 'aborted' | 'network' | 'http' | 'bad_response';

export class LlmProviderError extends Error {
  constructor(
    readonly category: LlmErrorCategory,
    readonly status?: number,
  ) {
    super(`LLM provider error: ${category}${status ? ` (${status})` : ''}`);
    this.name = 'LlmProviderError';
  }
}

type FetchLike = typeof fetch;

export function createOpenAiCompatibleProvider(
  config: LlmConfig,
  fetchImpl: FetchLike = fetch,
): LlmProvider {
  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  return {
    model: config.model,
    async complete({ system, user, signal }: ChatRequest): Promise<ChatResult> {
      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            temperature: LLM_TEMPERATURE,
            max_tokens: LLM_MAX_TOKENS,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
          }),
          signal,
        });
      } catch {
        throw new LlmProviderError(signal.aborted ? 'aborted' : 'network');
      }

      if (!response.ok) {
        // Do not read or surface the provider's error body.
        throw new LlmProviderError('http', response.status);
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new LlmProviderError(signal.aborted ? 'aborted' : 'bad_response');
      }

      const content = extractContent(payload);
      if (content === null) throw new LlmProviderError('bad_response');

      const reportedModel =
        typeof payload === 'object' &&
        payload !== null &&
        'model' in payload &&
        typeof payload.model === 'string' &&
        payload.model.length > 0
          ? payload.model
          : config.model;

      return { content, model: reportedModel };
    },
  };
}

function extractContent(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null || !('choices' in payload)) return null;
  const { choices } = payload;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first: unknown = choices[0];
  if (typeof first !== 'object' || first === null || !('message' in first)) return null;
  const { message } = first;
  if (typeof message !== 'object' || message === null || !('content' in message)) return null;
  return typeof message.content === 'string' ? message.content : null;
}

export function providerFromConfig(config: LlmConfig | null): LlmProvider | null {
  return config ? createOpenAiCompatibleProvider(config) : null;
}
