import { createApp, DEFAULT_CLIENT_DIST_DIR } from './app.js';
import { loadConfig } from './config.js';
import { loadSystemPrompt } from './historyOrganizer/index.js';
import { providerFromConfig } from './llm/providerAdapter.js';

const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3000;
const config = loadConfig();

const app = createApp({
  clientDistDir: isProduction ? DEFAULT_CLIENT_DIST_DIR : undefined,
  provider: providerFromConfig(config.llm),
  systemPrompt: loadSystemPrompt(),
  llmTimeoutMs: config.llmTimeoutMs,
  rateLimitMax: config.rateLimitMax,
  trustProxy: config.trustProxy,
});

app.listen(port, '0.0.0.0', () => {
  // Log only operational facts — never request content or secrets.
  console.log(
    `server listening on port ${port} (${isProduction ? 'production' : 'development'}); ` +
      `llm ${config.llm ? 'configured' : 'NOT configured'}`,
  );
});
