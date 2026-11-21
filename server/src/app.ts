import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type ErrorRequestHandler, type Express } from 'express';

export type AppOptions = {
  /**
   * Absolute path to the built client (client/dist). When set and present on
   * disk, the server serves it as static files with an SPA fallback, so the
   * whole app runs on one port in production.
   */
  clientDistDir?: string;
};

const here = path.dirname(fileURLToPath(import.meta.url));

/** Default location of the built client relative to server/src or server/dist. */
export const DEFAULT_CLIENT_DIST_DIR = path.resolve(here, '../../client/dist');

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');

  // API routes live under /api. Feature routes (POST /api/organize-story) are added later.
  const api = express.Router();
  api.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
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
  const errorHandler: ErrorRequestHandler = (_err, _req, res, _next) => {
    res.status(500).json({ error: 'internal_error' });
  };
  app.use(errorHandler);

  return app;
}
