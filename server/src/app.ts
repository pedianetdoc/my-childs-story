import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type ErrorRequestHandler, type Express } from 'express';
import { DEFAULT_LLM_TIMEOUT_MS, DEFAULT_RATE_LIMIT_MAX } from './config.js';
import { loadSystemPrompt } from './historyOrganizer/index.js';
import type { LlmProvider } from './llm/providerAdapter.js';
import { createOrganizeStoryRouter } from './routes/organizeStory.js';

export type AppOptions = {
  /**
   * Absolute path to the built client (client/dist). When set and present on
   * disk, the server serves it as static files with an SPA fallback, so the
   * whole app runs on one port in production.
   */
  clientDistDir?: string;
  /** LLM provider; null/undefined means "not configured" (503 on organize). */
  provider?: LlmProvider | null;
  systemPrompt?: string;
  llmTimeoutMs?: number;
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
  /** Express "trust proxy" (number of hops behind a reverse proxy, e.g. Replit). */
  trustProxy?: number | false;
  /** Operational log sink. Receives status/duration/category lines only. */
  log?: (line: string) => void;
};

const here = path.dirname(fileURLToPath(import.meta.url));

/** Default location of the built client relative to server/src or server/dist. */
export const DEFAULT_CLIENT_DIST_DIR = path.resolve(here, '../../client/dist');

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', options.trustProxy ?? false);

  // Same-origin only: no CORS headers are ever set, so browsers block
  // cross-origin calls to the API.
  const api = express.Router();
  api.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  api.use(
    createOrganizeStoryRouter({
      provider: options.provider ?? null,
      systemPrompt: options.systemPrompt ?? loadSystemPrompt(),
      timeoutMs: options.llmTimeoutMs ?? DEFAULT_LLM_TIMEOUT_MS,
      rateLimitMax: options.rateLimitMax ?? DEFAULT_RATE_LIMIT_MAX,
      ...(options.rateLimitWindowMs !== undefined && { rateLimitWindowMs: options.rateLimitWindowMs }),
      ...(options.log && { log: options.log }),
    }),
  );
  app.use('/api', api);
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  const { clientDistDir } = options;
  if (clientDistDir && fs.existsSync(path.join(clientDistDir, 'index.html'))) {
    app.use(express.static(clientDistDir, { index: false }));
    // SPA fallback: any non-API GET returns the client shell.
    app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
      res.sendFile(path.join(clientDistDir, 'index.html'));
    });
  }

  // Generic error handler. Never log or echo request bodies, narratives or LLM output.
  const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
    const type = typeof err === 'object' && err !== null && 'type' in err ? err.type : undefined;
    if (type === 'entity.too.large') {
      res.status(413).json({
        error: 'payload_too_large',
        message: 'The story is too long to send. Please shorten it to 5000 characters.',
      });
      return;
    }
    if (type === 'entity.parse.failed' || type === 'encoding.unsupported' || type === 'charset.unsupported') {
      res.status(400).json({ error: 'invalid_request', message: 'Please check the age and the story, then try again.' });
      return;
    }
    res.status(500).json({ error: 'internal_error', message: 'Something went wrong. Please try again.' });
  };
  app.use(errorHandler);

  return app;
}
