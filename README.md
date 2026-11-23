# My Child's Story

*Make the most of your developmental assessment appointment.*

[![CI](https://github.com/pedianetdoc/my-childs-story/actions/workflows/ci.yml/badge.svg)](https://github.com/pedianetdoc/my-childs-story/actions/workflows/ci.yml)

> **© 2026 Discerning Parenting (Victoria Ang-Nolasco, MD). All Rights Reserved.**
> This repository is public for course evaluation only. It is **not open source**. See [Copyright](#copyright) below.

> **Fictional data only. Not for clinical use.** This is a course MVP and educational prototype. Do not enter or speak real names, health information or patient details.

**Live demo:** _[add your Replit URL here]_

---

## What it does

Parents preparing for a developmental assessment often struggle to put their child's story into words, and specialists spend scarce visit time collecting routine history. My Child's Story helps the parent prepare:

1. **Tell your child's story.** Type or speak it in English, Filipino or Taglish. Guiding prompts (in English with Filipino underneath) help with a blank page, and a clearly labelled fictional example is available to try the app.
2. **Organize, don't diagnose.** AI sorts the parent's *own sentences* into 10 fixed categories (Main Concerns, Strengths, Communication, Social Interaction and Play, Movement, Daily Living, Learning and Thinking, Behavior, Medical and Health, Other). Every item is checked against the parent's exact words.
3. **Clarify selectively.** Up to three neutral follow-up questions the parent can answer, mark "I don't know" or skip. The questions are in English for English stories and in Filipino (with "po") for Filipino or Taglish stories.
4. **Add priorities and download.** The parent adds their own questions and expectations, then downloads the story as Word (.docx) and PDF to bring to the appointment, optionally with everything they originally wrote appended.
5. **In the meantime, connect, play and talk.** An optional, age-appropriate serve-and-return activity (fixed, clinician-written content; never AI-generated). The child's age only chooses which example to show; it is never used to interpret development.

An optional **"My child is:"** choice (a girl / a boy / prefer not to say, the default) only fills "her", "him" or "them" in the activity examples and tells the AI which pronoun to use in its questions. It is never guessed by the AI.

**What it never does:** diagnose, screen, score, rate severity or urgency, or recommend treatment.

## How the AI is kept safe

The AI's output is treated as untrusted and checked on the server before the parent sees anything. If any check fails, the whole response is rejected and the parent can retry; nothing is silently repaired.

- **Exact-quote check:** every organized item must match a passage the parent actually wrote (after normalizing Unicode, spaces, curly quotes, dashes and "…").
- **No rewording:** the displayed text must contain exactly the words of its quote. The only allowed change is dropping one leading connector (*and, then, also, so, tapos, saka*). Dropped negations ("hindi", "not") are rejected.
- **Neutral questions:** the AI's questions are screened for diagnostic, urgency and treatment terms and for links. The parent's own words are never filtered.
- **Question language decided in code, not by the AI:** if common Filipino function words (*ang, ng, sa, siya, hindi, kasi, po*…) make up at least 15% of the story, questions are in Filipino; otherwise English. A name like "Lola" in an English story does not switch it.
- **Prompt-injection resistance:** the story is passed as delimited data, between markers with a random per-request id, never as instructions.
- **Privacy by design:** no database, no logging of stories or AI output, no audio storage. Drafts live only in the browser tab (`sessionStorage`); **Clear My Information** removes them, and **Download My Draft** saves a plain-text copy.
- **Abuse limits:** 32 KB request limit, rate limit of 10 requests per IP per 15 minutes, 60-second AI timeout, and a provider spending cap (set in the provider account).
- **A static safety notice** on every screen tells parents to contact a doctor now about lost skills, seizures or safety worries. It is not AI-triggered.

The AI's instructions are in [`server/prompts/history-organizer.v1.md`](server/prompts/history-organizer.v1.md) (version `history-organizer.v1.2`), reviewed by a developmental-behavioral pediatrician. The version is returned with every result.

## Tech stack

| Layer | Choice |
|---|---|
| Client | React + TypeScript (Vite), mobile-first |
| Server | Node.js + Express + TypeScript |
| AI | OpenAI-compatible chat API via OpenRouter (model `openai/gpt-4.1-mini`), JSON output, temperature 0.1, max 4,000 tokens |
| Validation | Zod + deterministic source-quote matching |
| Voice input | Browser Web Speech API (English `en-PH` / Filipino `fil-PH`), with typing fallback |
| Export | Word (`docx`) and PDF (`pdf-lib`, embedded DejaVu Sans so ñ/Ñ render) generated in the browser |
| Tests | Vitest + React Testing Library; the AI is always mocked in tests |
| CI | GitHub Actions: install, typecheck, test, build on every push and pull request |
| Hosting | Replit (Autoscale deployment) |

See [`docs/architecture.md`](docs/architecture.md) for the architecture notes.

## Repository layout

```text
shared/   request/response types, Zod schemas, the fixed categories and limits
server/   Express + TypeScript API; serves the built client in production
client/   React + TypeScript + Vite, mobile-first
docs/     architecture notes and manual real-browser checks
```

## Running locally

Requires Node.js 20+ (CI uses Node 22).

```bash
npm install
cp .env.example .env      # then fill in your own values
npm run dev               # client (Vite, :5173, proxies /api) + server (Express, :3000) in watch mode
```

| Variable | Purpose |
|---|---|
| `LLM_API_KEY` | API key for the AI provider (server only, never committed) |
| `LLM_MODEL` | Model name, e.g. `openai/gpt-4.1-mini` on OpenRouter |
| `LLM_BASE_URL` | Optional; e.g. `https://openrouter.ai/api/v1` (default `https://api.openai.com/v1`) |
| `LLM_TIMEOUT_MS` | Optional; default 60000 |
| `RATE_LIMIT_MAX` | Optional; default 10 requests per IP per 15 minutes |
| `PORT` | Port the server listens on; default 3000 (Replit sets it) |
| `TRUST_PROXY` | Optional; reverse-proxy hops to trust for client IPs (rate limiting). Default 1 in production, off in development |

Without `LLM_API_KEY` and `LLM_MODEL` the app still runs; organizing a story then fails with HTTP 503 and the parent sees a friendly retry message, with their text kept.

Other scripts:

```bash
npm run typecheck   # TypeScript checks, client and server
npm test            # unit and integration tests (AI mocked)
npm run build       # production build (shared, server/dist, client/dist)
npm start           # serve the production build on $PORT
```

### Deploying on Replit

`.replit` builds with `npm run build` and runs `npm start` (Autoscale). The server listens on `$PORT` on `0.0.0.0` and serves the client from the same origin. Set `LLM_API_KEY`, `LLM_MODEL` and, if needed, `LLM_BASE_URL`, `LLM_TIMEOUT_MS` and `RATE_LIMIT_MAX` as Replit Secrets.

## Project documents

| File | What it is |
|---|---|
| [`spec.md`](spec.md) | Implementation specification (v1.5): the source of truth, with acceptance criteria AC-01 to AC-21 |
| [`CLAUDE.md`](CLAUDE.md) | Project rules for Claude Code |
| [`.cursorrules`](.cursorrules) | Project rules for Cursor |
| [`docs/architecture.md`](docs/architecture.md) | Architecture notes |
| [`docs/manual-tests.md`](docs/manual-tests.md) | Real-browser checks (voice input, downloads, draft) |

The Product Requirements Document and Idea Validation Report were submitted separately on Canvas.

## How it was built

Built with an AI-assisted, spec-driven workflow: idea validation → PRD → `spec.md` → Claude Code working from `CLAUDE.md`, one feature per pull request, each merged only after CI passed. The clinician-founder reviewed all clinical content: the AI instructions, category definitions and activity text.

## Not yet implemented / known limits

- `npm run eval` (real-model evaluation on synthetic cases) is specified but not yet built; there is no `eval` script yet.
- Voice input works only in browsers that support the Web Speech API (Chrome, Edge, Safari; not Firefox). Taglish dictation may need corrections because the recognizer listens for one language at a time.
- The interface is in English; guiding prompts include Filipino.
- Real-device checks are listed in `docs/manual-tests.md`.
- Not approved for real patient data. A clinical version would need Data Privacy Act compliance, security review, consent flows and clinical validation.

## Copyright

**© 2026 Discerning Parenting (Victoria Ang-Nolasco, MD). All Rights Reserved.**

This repository and its contents (source code, specification, AI instructions, clinical content and design) are proprietary. The repository is public **only** so the course can evaluate it. No license is granted. You may not copy, modify, distribute, sublicense or use any part of it, commercially or otherwise, without prior written permission from the copyright holder.

- The serve-and-return activity content is adapted from *Toddler Talking* by Victoria Ang-Nolasco, MD, © 2022. All rights reserved.
- "Serve and return" is a concept from the [Center on the Developing Child at Harvard University](https://developingchild.harvard.edu/science/key-concepts/serve-and-return/), credited in the app.
- Third-party open-source libraries and fonts used by this project remain under their own licenses.

For permission requests, visit [discerningparenting.com](https://discerningparenting.com).
