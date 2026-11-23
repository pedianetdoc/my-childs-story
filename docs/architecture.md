# Architecture notes

My Child's Story is a small client–server web app. The browser does almost everything (input, voice, preview, exports, draft storage). The server has one job: send the parent's story to an AI model with a fixed prompt and return only a result that passes strict, deterministic checks. `spec.md` (v1.5) is the source of truth; these notes describe how the code implements it.

## Overview

```text
Browser (React + TypeScript, Vite)
  ├─ Start screen: age, optional "My child is", story box with X / 5000 counter,
  │   guiding prompts, fictional example, voice dictation (Web Speech API)
  ├─ Preview: categories, clarification questions, parent questions/expectations,
  │   "In the meantime, connect, play and talk" activity
  ├─ Downloads: Word (.docx) and PDF, built in the browser from the same draft
  └─ Draft: sessionStorage autosave, Clear My Information, Download My Draft (.txt)
            │
            │  POST /api/organize-story   (same origin, JSON ≤ 32 KB)
            ▼
Server (Node.js + Express + TypeScript)
  ├─ routes/organizeStory.ts   rate limit → body limit → request validation
  ├─ historyOrganizer/         language decision, prompt + user message, timeout,
  │                            JSON parse, response validation, meta
  ├─ llm/providerAdapter.ts    the only code that calls the AI provider
  └─ validation/               Zod schema + quote, text and question checks
            │
            ▼
OpenAI-compatible chat API (e.g. OpenRouter)
```

Speech recognition runs in the browser; audio never reaches the server. Only the final text, reviewed by the parent, is sent.

## Repository layout

| Path | Contents |
|---|---|
| `shared/src/` | Types (`OrganizeStoryRequest`, `OrganizeStoryResponse`, `PreparationDraft`), Zod schemas, the 10 categories in fixed order, limits. Used by both client and server. |
| `server/src/app.ts` | Express app: `/api/health`, the organize route, static client in production, a generic error handler that never logs or echoes input. |
| `server/src/config.ts` | Environment variables and defaults (timeout 60 s, rate limit 10 / 15 min, temperature 0.1, max 4,000 tokens, 32 KB body). |
| `server/src/routes/organizeStory.ts` | `POST /api/organize-story`. |
| `server/src/historyOrganizer/` | `organizeStory.ts` (orchestration), `prompt.ts` (prompt loading, version, user message), `detectLanguage.ts` (question language). No Express code. |
| `server/src/llm/providerAdapter.ts` | OpenAI-compatible `chat/completions` call. |
| `server/src/validation/` | `validateResponse.ts`, `normalize.ts`, `leadingConnectors.ts`, `questionDenyList.ts`. |
| `server/prompts/history-organizer.v1.md` | The clinician-reviewed system prompt (version `history-organizer.v1.2`). |
| `client/src/input/` | Story form and client-side validation. |
| `client/src/voice/` | Dictation controller (framework-free) and its UI. |
| `client/src/api/` | The organize request and its error handling. |
| `client/src/preview/` | Read-only preview, clarification questions, activity picker. |
| `client/src/content/` | Fixed parent-facing text: notices, guiding prompts, fictional example, activity content. |
| `client/src/export/` | Export content, DOCX and PDF renderers, file names, download panel. |
| `client/src/draft/` | Draft state, sessionStorage, draft `.txt`, Clear My Information. |

## Request flow: Organize My Story

1. **Client validation** (`client/src/input/validateStoryInput.ts`) uses the same shared Zod schemas as the server: age 0–216 months or 0–18 years with at most one decimal, story 20–5,000 Unicode code points after trimming, optional `childPronoun`. Invalid input never leaves the browser.
2. **One request** (`client/src/api/organizeStory.ts`): the button is disabled while waiting and a guard blocks double submits. The client gives up after 70 s, just after the server's own 60 s timeout.
3. **Server route** (`server/src/routes/organizeStory.ts`):
   - rate limit (10 per IP per 15 min; 429 with a friendly message);
   - JSON body limit of 32 KB (413);
   - request validation with the shared schema (400, fixed field messages that never echo input);
   - 503 if no AI provider is configured.
4. **history-organizer** (`server/src/historyOrganizer/organizeStory.ts`):
   - trims the narrative once, so the prompt and the checks use the same text;
   - decides the question language (below) and builds the user message (`prompt.ts`): age (context only), the parent's pronoun choice or "not given", the language instruction, and the narrative between `<<<BEGIN_PARENT_NARRATIVE id=…>>>` / `<<<END_PARENT_NARRATIVE id=…>>>` markers with a random per-request id;
   - calls the provider with an abort signal and a 60 s timeout (504 on timeout);
   - parses JSON and runs the full response validator;
   - adds `meta: { promptVersion, model }`.
5. **Response:** 200 with the validated result, or a generic error (502/504) that the client turns into a fixed friendly message with **Try again**. The parent's text is always kept.

### Question language

`server/src/historyOrganizer/detectLanguage.ts` counts common Filipino function words (*ang, ng, mga, sa, na, si, siya, niya, ko, ako, ka, mo, po, hindi, wala, ayaw, kasi, pero, tapos, din, rin, lang, naman, yung, ito, iyon, ba*) as a share of all words. At least 15% → Filipino (so Taglish counts as Filipino); otherwise English. The model is told explicitly which language to use. Names such as "Lola" are not function words, so they never switch an English story to Filipino.

## Response validation (spec 4.6)

`server/src/validation/validateResponse.ts` rejects the **whole** response if any check fails. Nothing is repaired or partially shown.

| Check | How |
|---|---|
| Shape | Zod: exactly the 10 category keys, no extra keys, arrays of `{ text, sourceQuote }`, length caps, 0–3 questions with distinct ids `q1`–`q3`. |
| Source quote | After normalization (NFC; curly → straight quotes; en/em dash → `-`; `…` → `...`; whitespace collapsed), `sourceQuote` must appear in the narrative. Case-sensitive. |
| Text | After lowercasing and removing punctuation, the words of `text` must equal the words of `sourceQuote`, optionally minus **one** leading connector (*and, then, also, so, tapos, saka*). Dropped negations or trailing words fail. |
| Questions | `question` and `reason` must not contain deny-listed diagnostic, severity/urgency or treatment terms, or URLs. The parent's words are never screened. |

Issues carry only a code and a path, never the offending text, so they are safe to count in logs.

## AI provider

`server/src/llm/providerAdapter.ts` is the only module that talks to the provider. It posts to `{LLM_BASE_URL}/chat/completions` with `response_format: { type: "json_object" }`, temperature 0.1 and `max_tokens` 4,000. Errors carry only a category and HTTP status; provider response bodies are never read into errors or logs.

The system prompt is loaded from `server/prompts/history-organizer.v1.md`. Its leading HTML comment (review status and maintainer notes) is stripped before sending. Any change to the prompt bumps `PROMPT_VERSION` in `server/src/historyOrganizer/prompt.ts`; the version is returned in every result.

## Client

- **Draft state** (`client/src/draft/draft.ts`): one object holds everything the parent entered and the validated result. The preview, both exports and session storage all read it, so Word and PDF always match what the parent sees.
- **Voice** (`client/src/voice/`): the controller feature-detects `SpeechRecognition` / `webkitSpeechRecognition` and uses `continuous` + `interimResults`. Final text is appended to the same story field; interim text is shown separately. It restarts after silence until Stop, stops at 5,000 characters, and maps browser errors to friendly messages. It never submits. Without browser support, the mic is hidden and typing guidance is shown.
- **Preview** (`client/src/preview/`): read-only; only populated categories, in fixed order; all generated text is rendered as plain text. **Edit My Story** returns to the filled-in story, and organizing again asks for confirmation. Regeneration replaces categories and clarification answers, and keeps parent questions, expectations and the activity.
- **Activity** (`client/src/content/activities.ts`, `client/src/preview/ActivityPicker.tsx`): fixed, clinician-approved serve-and-return text. The entered age chooses one of six example bands (years × 12 = months; 36 months is the 3–5 band) and is never interpreted. `{them}` / `{their}` are filled from the optional pronoun choice.
- **Export** (`client/src/export/`): `exportDocument.ts` builds one list of blocks; `docx.ts` and `pdf.ts` render the same blocks. The PDF embeds a subset of DejaVu Sans. The libraries and font load only when the parent downloads. The file name defaults to `story-YYYY-MM-DD` (local date) and is sanitized.
- **Draft continuity** (`client/src/draft/`): autosave to `sessionStorage` (this tab only, every call in try/catch, invalid data discarded); a leave-page warning while there is a draft; **Clear My Information**; **Download My Draft** (.txt).

## Privacy and security

- No database, no server-side draft storage, no analytics, no audio storage.
- The server never logs request bodies, narratives or AI output, including in error handlers. Each request logs one line: status, duration and an error category.
- Secrets are server environment variables only and are never sent to the client.
- Same-origin only: no CORS headers are set. Express `trust proxy` is set from `TRUST_PROXY` so rate limiting sees real client IPs behind Replit's proxy.
- The narrative is treated as untrusted data (delimited, never followed as instructions); generated text is plain text in the UI.

## Configuration

| Variable | Default | Used for |
|---|---|---|
| `LLM_API_KEY` | none (organize returns 503) | provider credential |
| `LLM_MODEL` | none (organize returns 503) | model name |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible endpoint, e.g. OpenRouter |
| `LLM_TIMEOUT_MS` | 60000 | AI request timeout |
| `RATE_LIMIT_MAX` | 10 | organize requests per IP per 15 minutes |
| `PORT` | 3000 | server port |
| `TRUST_PROXY` | 1 in production, off in development | proxy hops for client IPs |

## Testing and CI

- Vitest in `server/` and `client/`; React Testing Library in the client. The AI is always mocked.
- Server tests cover the validator with hostile cases (invented quotes, paraphrase, translation, dropped negations, extra keys, too many questions, blocked terms, punctuation-only differences that must pass), the route (limits, timeout, rate limit, no logging of content), the provider adapter, the prompt and the language decision.
- Client tests cover input and validation, voice (with a fake recognition object), the organize flow and errors, the preview, the activity and pronouns, export content (blocks, DOCX XML, PDF layout and a real PDF render) and draft storage.
- `.github/workflows/ci.yml` runs `npm ci`, `npm run typecheck`, `npm test` and `npm run build` on every push and pull request (Node 22).
- Real-browser checks (voice on Chrome, Android, iOS Safari and Firefox; opening downloads) are in `docs/manual-tests.md`.

## Deployment

Replit Autoscale (`.replit`): `npm run build` builds `shared`, `server/dist` and `client/dist`; `npm start` runs one Express process on `$PORT` that serves `/api` and the built client from the same origin.

## Known limits

- `npm run eval` (real-model evaluation on synthetic cases, spec section 8) is not built yet.
- The source-quote and text checks prove attribution, not clinical accuracy; clinicians and parents still check meaning and omissions.
- `sessionStorage` and browser speech recognition are not clinical-grade privacy measures; the public demo is for fictional stories only.
