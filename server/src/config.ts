/**
 * Server configuration from environment variables. Server-side only; never
 * import this (or the values) into client code.
 */

export const DEFAULT_LLM_TIMEOUT_MS = 60_000;
export const DEFAULT_RATE_LIMIT_MAX = 10;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const DEFAULT_LLM_BASE_URL = 'https://api.openai.com/v1';
export const LLM_MAX_TOKENS = 4000;
export const LLM_TEMPERATURE = 0.1;
export const JSON_BODY_LIMIT = '32kb';

export type LlmConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

export type ServerConfig = {
  /** Null when LLM_API_KEY or LLM_MODEL is missing; the route then returns 503. */
  llm: LlmConfig | null;
  llmTimeoutMs: number;
  rateLimitMax: number;
  /** Express "trust proxy" setting: number of proxy hops, or false. */
  trustProxy: number | false;
};

type Env = Record<string, string | undefined>;

function positiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function loadConfig(env: Env = process.env): ServerConfig {
  const apiKey = env.LLM_API_KEY?.trim();
  const model = env.LLM_MODEL?.trim();
  const baseUrl = env.LLM_BASE_URL?.trim() || DEFAULT_LLM_BASE_URL;

  const trustProxyRaw = env.TRUST_PROXY?.trim();
  const trustProxy =
    trustProxyRaw === undefined || trustProxyRaw === ''
      ? env.NODE_ENV === 'production'
        ? 1
        : false
      : trustProxyRaw === 'false' || trustProxyRaw === '0'
        ? false
        : positiveInt(trustProxyRaw, 1);

  return {
    llm: apiKey && model ? { apiKey, model, baseUrl } : null,
    llmTimeoutMs: positiveInt(env.LLM_TIMEOUT_MS, DEFAULT_LLM_TIMEOUT_MS),
    rateLimitMax: positiveInt(env.RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX),
    trustProxy,
  };
}
