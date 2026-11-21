import { createApp, DEFAULT_CLIENT_DIST_DIR } from './app.js';

const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3000;

const app = createApp({
  clientDistDir: isProduction ? DEFAULT_CLIENT_DIST_DIR : undefined,
});

app.listen(port, '0.0.0.0', () => {
  // Log only operational facts — never request content.
  console.log(`server listening on port ${port} (${isProduction ? 'production' : 'development'})`);
});
