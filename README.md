# my-childs-story
My Child's Story — helps parents tell their child's developmental story (typed or spoken, English/Filipino/Taglish) and organizes it, without diagnosis, for their developmental assessment appointment. Course MVP: fictional data only.

> **Fictional data only.** This public demo is not approved for real patient information, screening, diagnosis or treatment advice. See `spec.md` (v1.3), the source of truth.

## Repository layout

```text
shared/   shared types and the fixed category constants (spec 4.3–4.7)
server/   Express + TypeScript API; serves the built client in production
client/   React + TypeScript + Vite, mobile-first
```

## Getting started

Requires Node.js 20+ (CI uses 22).

```bash
npm install
cp .env.example .env   # fill in server-side values locally; never commit .env
npm run dev            # Vite on :5173 (proxies /api) + Express on :3000
```

| Script | What it does |
|---|---|
| `npm run dev` | Watches shared, server and client |
| `npm run typecheck` | `tsc --noEmit` for server and client |
| `npm test` | Vitest in server and client (LLM always mocked) |
| `npm run build` | Builds shared, server (`server/dist`) and client (`client/dist`) |
| `npm start` | Production: one Express process on `$PORT` serving `/api` and the built client |

## Deploying on Replit

`.replit` builds with `npm run build` and runs `npm start`. The server listens on `process.env.PORT` on `0.0.0.0` and serves the client from the same origin. Set `LLM_API_KEY`, `LLM_MODEL` and (optionally) `LLM_BASE_URL`, `LLM_TIMEOUT_MS`, `RATE_LIMIT_MAX` as Replit Secrets.
