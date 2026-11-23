# My Child's Story — Core AI Module Specification

**Version:** 1.4 (course MVP)
**Date:** 22 November 2026
**Status:** Implementation-ready specification; not clinically validated
**Core module:** `history-organizer`
**Parent-facing subtitle:** *Make the most of your developmental assessment appointment.*
**Companion artifacts:** Idea Validation Report (revised); one-page PRD; architecture notes (Section 3); change log (Section 10)

This spec contains the five required spec elements:

| Required element | Section |
|---|---|
| Context & Goal | 1 |
| Inputs / Outputs | 4 |
| Tech Stack | 3 |
| Edge Cases | 6 |
| Acceptance Criteria | 7 |

---

## 1. Context & Goal

Parents preparing for a developmental assessment may struggle to organize their child's story, while clinicians spend substantial consultation time collecting developmental histories. **My Child's Story** lets a parent **type or speak** an everyday-language account of their child's strengths and concerns. An LLM sorts the *parent's own statements* into fixed categories. It does not summarize clinically, score, diagnose, or rewrite them into interpretations. It also proposes **zero to three** optional, neutral clarification questions grounded in the narrative. The parent adds their priorities, optionally selects one fixed preparation activity, and downloads their story as Word and PDF.

**Why voice input is a core feature:** typing a long narrative is a barrier for many parents, especially on a phone. Speaking the story is closer to how parents describe their child to a doctor. Voice is optional; typing always works.

**Parent promise:** “Help your doctor understand your child's story so you make the most of your appointment.”
**Clinician promise:** “Spend less time collecting routine history and more time understanding the child and family.”

**Hypothesis, not a proven outcome:** an organized, source-faithful parent account may improve preparation and conversational flow without reducing the completeness or quality of the assessment. The Idea Validation Report's Test T2 checks this against a conventional form.

**Public-demo safety boundary:** fictional/synthetic child stories **only**. The app is not approved for real patient information, clinical triage, screening, diagnosis, treatment advice, or actual clinic deployment.

**Delivery assumption (MVP):** the parent brings or sends the downloaded file to the clinic themselves. The app does not transmit anything to a clinician.

## 2. Goals and Non-Goals

**Goals:** fast, low-effort story capture (typed or spoken); faithful categorization traceable to the parent's words; up to three useful clarification questions; a clean, editable document for the visit.

**Non-goals (v1):** diagnosis, screening, clinical urgency evaluation, individualized treatment plans, real patient-data processing, therapist or provider matching, appointment booking, clinician dashboard, EMR integration, accounts, cloud history storage, clinical note signing, audio file upload or storage, cross-session recovery, and draft import. The future *Before We Meet* clinic/EMR product would need separate professional, regulatory, privacy and technical validation.

## 3. Tech Stack, Architecture & Data Flow

```text
React + TypeScript client (HTTPS)
  ├─ age field; story field with live counter; optional voice dictation (Start/Stop, language choice)
  ├─ guiding prompts; static safety notice; fictional-data-only notice
  ├─ read-only categorized preview; Edit My Story; optional clarification answers
  ├─ parent questions/expectations; one optional serve-and-return activity (Connect / Play / Talk) + feedback
  ├─ tab-session autosave; Clear My Information; Download My Draft (.txt)
  └─ local .docx / .pdf export, with optional original narrative
              │ POST /api/organize-story (HTTPS, same origin)
              ▼
Node.js + Express + TypeScript backend
  ├─ body-size limit; rate limit; input validation; 60 s timeout
  ├─ history-organizer: fixed, versioned prompt; untrusted-data framing
  ├─ provider adapter: OpenAI-compatible chat API via server-only credential
  ├─ Zod schema check; source-quote and text checks; question screening
  └─ return categories + ≤3 questions + metadata; no request/response logging
              │
              ▼
External LLM API (transient processing; vendor handling subject to its terms)
```

Speech recognition runs in the **browser** and never touches our server. Only the final, parent-reviewed text is sent to `/api/organize-story`.

| Layer | MVP implementation |
|---|---|
| UI | React + TypeScript; responsive, mobile-first; accessible controls (labels, focus states, large mic button) |
| API | Node.js + Express + TypeScript |
| AI | Configurable OpenAI-compatible chat API; structured JSON output mode; temperature ≤ 0.2; bounded `max_tokens` (default 4,000) |
| Prompt | Stored in the repo at `server/prompts/history-organizer.v1.md`; version string returned in response metadata |
| Validation | Zod (or equivalent) + deterministic source-quote matching + question screening |
| Voice input | Browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`), feature-detected; typed fallback |
| Temporary work | `sessionStorage` scoped to the current tab; in-memory state for rendering; no server database |
| Preparation activity | “In the meantime, connect, play and talk”: clinician-approved serve-and-return text and three options (Connect / Play / Talk), each with fixed example text for six age bands, in `client/src/content/activities.ts`; no AI-generated activities |
| Export | Client-generated DOCX (e.g., `docx` library) and PDF (e.g., `pdf-lib`/`jsPDF` with an embedded Unicode font) from the same reviewed state |
| Tests / CI | Vitest with mocked LLM; GitHub Actions running typecheck, tests, build |
| Evaluation | `npm run eval`: runs synthetic cases against the real model, **outside CI** (Section 8) |
| Deploy | HTTPS via Replit deployment or comparable host |
| AI coding config | `CLAUDE.md` and `.cursorrules` at repo root, summarizing this spec's rules for AI coding tools |

**Environment:** `LLM_API_KEY`, `LLM_MODEL`, optional `LLM_BASE_URL`, optional `LLM_TIMEOUT_MS` (default 60000), `RATE_LIMIT_MAX` (default 10 per IP per 15 min). Server-side only. Provide `.env.example` with placeholders. Set a spending cap on the provider account. No credentials or identifiable patient stories in the public repository.

**Module boundary:** keep `history-organizer` separate from the provider adapter and the UI, preserving a future EMR integration boundary without building an EMR connector.

**No RAG, vector storage, user accounts, real patient database, or server-side draft storage.**

## 4. Inputs & Outputs

### 4.1 Story input (typed or spoken)

- One **age** field (number, up to one decimal place) and a **unit** selector (`months` | `years`). Valid range: 0–216 months or 0–18 years. Age is context only, **not** a basis for developmental interpretation.
- One **story** field. Typing and dictation write into the **same** editable field.
- Live counter `X / 5000` (Unicode code points, after trimming). Suggested time: **about five minutes**; this is guidance, not a deadline.
- Prevent input beyond 5,000 characters and explain the limit. Never truncate silently.
- Accept English, Filipino and Taglish.
- **Guiding prompts** shown above the field (optional, not required fields): *What worries you most? When did you first notice it? What does your child enjoy or do well? How do everyday routines go?* Each prompt has a Filipino translation underneath.
- Do **not** collect the child's name, exact birthdate, address, school, contact details or real records. A prefilled fictional example, clearly labeled as fictional, may be offered.

### 4.2 Voice dictation (optional)

| Item | Requirement |
|---|---|
| Detection | Show the microphone button only if `window.SpeechRecognition` or `window.webkitSpeechRecognition` exists. Otherwise show “Voice input isn't available in this browser; please type.” |
| Language | Selector: **English (Philippines)** `en-PH` or **Filipino** `fil-PH`, default English. Explain that the recognizer listens for one language at a time, so Taglish may need corrections. |
| Controls | Large Start / Stop button with a visible “Listening…” state. `continuous = true`, `interimResults = true`. |
| Transcript | Show interim text in a lighter style; append final results to the story field at the end of the existing text, separated by a space. The parent can edit at any time. |
| Long dictation | Browsers may end recognition after silence. If `end` fires while the parent has not pressed Stop, restart recognition automatically once per `end` event, up to the 5,000-character limit. |
| Limit | Stop recognition and show the limit message when the field reaches 5,000 characters. |
| Errors | `not-allowed` / `service-not-allowed`: explain how to allow the microphone and fall back to typing. `no-speech`, `network`, `audio-capture`: show a short message; keep all text. |
| No auto-submit | Dictation never triggers Organize My Story. The parent must review and press it. |
| Privacy | The app stores no audio. The notice states that some browsers send audio to their own speech service, and that real personal or clinical information must not be spoken. |

### 4.3 API request: `POST /api/organize-story`

```ts
type OrganizeStoryRequest = {
  childAge: { value: number; unit: 'months' | 'years' }; // finite, ≥0, ≤216 months / ≤18 years, ≤1 decimal
  narrative: string; // 20–5000 Unicode code points after trimming
};
```

Validate on **both** client and server. Server rejects bodies over 32 KB before parsing.

### 4.4 Fixed category schema

Use this **exact order and parent-facing labels**:

| Key | Display label | Scope |
|---|---|---|
| `main_concerns` | Main Concerns | Only statements the parent frames as a worry or the reason for the visit |
| `strengths` | Strengths | What the child does well or enjoys |
| `communication` | Communication | Understanding, speaking, gestures, and the languages used with the child at home |
| `social_interaction_play` | Social Interaction and Play | Play, relating to others |
| `movement` | Movement | Gross and fine motor skills and coordination only (amount of exercise or physical activity goes in Medical and Health) |
| `daily_living` | Daily Living | Eating, dressing, toileting, everyday routines (sleep and screen time go in Medical and Health) |
| `learning_thinking` | Learning and Thinking | School, learning, attention to tasks |
| `behavior` | Behavior | Emotions, reactions, regulation |
| `medical_health` | Medical and Health | Only parent-volunteered details: pregnancy/birth, medical, hearing, vision, medication; sleep (including bedtime and amount); screen and gadget time; amount of exercise or physical activity; previous assessments, diagnoses or therapies |
| `other` | Other | Relevant statements that fit nowhere else, such as family situation, caregivers, siblings or recent changes at home |

Do not generate a medical-history checklist. Empty categories stay empty internally and are **omitted** in the preview and downloads. Neither the app nor the document implies that missing means normal or impaired.

### 4.5 LLM response (strict JSON)

```ts
type HistoryCategory =
  | 'main_concerns' | 'strengths' | 'communication'
  | 'social_interaction_play' | 'movement' | 'daily_living'
  | 'learning_thinking' | 'behavior' | 'medical_health' | 'other';

type ReportedItem = {
  text: string;        // ≤1000 chars; the source quote, at most minimally cleaned (rule 4.6.2)
  sourceQuote: string; // ≤1000 chars; contiguous substring of the narrative (rule 4.6.1)
};

type Clarification = {
  id: 'q1' | 'q2' | 'q3';
  question: string;    // ≤200 chars; one neutral factual question, in the narrative's main language
  reason: string;      // ≤200 chars; why the narrative left this unclear; no medical claim
};

type OrganizeStoryResponse = {
  categories: Record<HistoryCategory, ReportedItem[]>; // all ten keys present, arrays may be empty
  clarificationQuestions: Clarification[];            // 0–3, distinct IDs
};

// Added by the server after validation, not by the LLM:
type OrganizeStoryResult = OrganizeStoryResponse & {
  meta: { promptVersion: string; model: string };
};
```

### 4.6 Server validation rules

Reject the **whole** response (no silent repair) if any of rules 1, 2, 4 or 5 fails. Rule 3 is guidance for the prompt and human evaluation.

1. **Source quote.** After normalization, `sourceQuote` must appear contiguously in the normalized narrative. Normalization applies to both strings: Unicode NFC; collapse runs of whitespace to one space; curly quotes and apostrophes to straight (`“ ” ‘ ’` → `" '`); en/em dashes to `-`; `…` to `...`. Matching is case-sensitive. No composite or paraphrased quotes.
2. **Text.** `text` must stay in the narrative's language (no translation) and be minimally cleaned at most: trimmed; **one** leading connector removed; first letter capitalized; terminal period added. The leading connectors are a fixed list (`server/src/validation/leadingConnectors.ts`): *and, then, also, so, tapos, saka*. Check: after lowercasing and removing punctuation, the words of `text` must **equal** the words of `sourceQuote`, or equal them minus one leading connector from that list. Dropping any other word fails, including negations (“not”, “hindi”) and trailing words. “At” is not a connector here, because it is also an English preposition (“At home he cries”). The prompt names exactly the same connectors.
3. **Splitting.** A passage may be split into **non-overlapping**, contiguous, faithful subspans for different categories (e.g., pencil grip under Movement and dressing under Daily Living). Default to one category per statement; no redundant duplication. Overlap is avoided through the prompt and checked during human evaluation (Section 8); the validator does **not** enforce it, so this rule is not a rejection condition.
4. **Schema.** All ten keys; no extra keys; arrays only; length caps; 0–3 questions; distinct IDs.
5. **Question screening.** `question` and `reason` must not contain diagnostic labels, severity or urgency words, or treatment advice (deny-list in `server/src/validation/questionDenyList.ts`, e.g., *autism, ASD, ADHD, delay, disorder, normal, abnormal, red flag, urgent, therapy, medication*), and must not contain URLs. This check does **not** apply to `text`/`sourceQuote`: the parent's own words are kept even if they use such terms.

Source matching validates attribution, **not** semantic or clinical correctness. Parents and clinicians must still check meaning and omissions. The original narrative is the authoritative source.

**Prompt injection:** the prompt wraps the narrative in delimiters and instructs the model to treat it as data. Embedded instructions are never followed. Generated text is rendered as plain text only.

### 4.7 Parent-owned draft (not sent for another LLM round)

```ts
type PreparationDraft = {
  childAge: OrganizeStoryRequest['childAge'];
  originalNarrative: string;                 // never overwritten by the LLM
  dictationLanguage: 'en-PH' | 'fil-PH';
  categories: Record<HistoryCategory, ReportedItem[]>;
  clarificationQuestions: Clarification[];
  clarificationAnswers: Array<{
    id: 'q1' | 'q2' | 'q3';
    status: 'answered' | 'unknown' | 'skipped';
    answer?: string;
  }>;
  parentQuestions: string;                   // unaltered free text
  visitExpectations: string;                 // unaltered free text
  activity?: {
    activityId: 'connect' | 'play' | 'talk';
    status: 'not_yet' | 'tried' | 'could_not_try';
    notes?: string;
  };
  includeOriginalNarrative: boolean;         // default false
  exportBaseName?: string;                   // defaults on download
  meta?: { promptVersion: string; model: string };
};
```

The categorized preview is **read-only** in the MVP. **Edit My Story** returns to the original input (still filled in) for changes and regeneration. Before regenerating, warn that the previous categories and clarification answers will be replaced; keep parent questions, expectations and activity responses. Never replace generated output or the original account silently. Corrections after download are made in the Word file or by hand on the printed PDF. Downloads are never presented as clinician-verified.

### 4.8 Exported document (DOCX and PDF)

Generated from the **same** draft state. Contents, in order:

1. Header **My Child's Story**; child's age; date.
2. Label: **“Parent-reported; not independently verified. Organized with AI assistance and reviewed by the parent.”**
3. Populated categories in the fixed order (empty ones omitted).
4. Clarification questions with answers, kept separate from the original statements; unanswered ones marked “Not answered” or “Parent doesn't know.”
5. Parent questions and visit expectations, verbatim.
6. Selected activity: the chosen option (Connect / Play / Talk), its example text for the child's age band, status and notes (omitted if none selected).
7. Appendix, **only if** “Also include everything I originally wrote” is checked: the exact original narrative.

Default file base name `story-YYYY-MM-DD` using the browser's local date; editable, with paths and illegal filename characters stripped. Long documents wrap and paginate cleanly. The PDF embeds a Unicode font so Filipino characters (ñ, Ñ) render correctly.

## 5. Parent Experience Flow

1. **Start:** fictional-data-only notice; static safety notice (below); about five minutes suggested; age field; story field with counter; guiding prompts; microphone button if supported.
2. **Tell the story:** type, dictate, or both, in one field. Review and correct the text.
3. **Organize My Story:** one AI request; loading state; button disabled while waiting; 60-second server timeout (configurable). This is not a limit on the parent's writing or speaking time.
4. **Preview:** populated categories in fixed order; “Parent-reported; not independently verified” label; Edit My Story; up to three optional clarification questions (answer / I don't know / skip), each with its reason shown as small helper text; two free-text fields for parent questions and expectations.
5. **In the meantime, connect, play and talk (optional):** clinician-approved serve-and-return content from `client/src/content/activities.ts`: the heading and bridge paragraph; a collapsible “What is serve and return?” explanation (what it is, why it matters with a link to the Center on the Developing Child at Harvard University opening in a new tab with `rel="noopener noreferrer"`, the five simple steps). The parent chooses at most one of **Connect / Play / Talk** (default: none). Only that option's example for the child's age band is shown. Age bands: under 12 months, 12–23 months, 24–35 months, 3–5 years, 6–12 years, 13–18 years, chosen deterministically from the entered age (years × 12 = months; 36 months is the 3–5 band). **Age is used only to choose example text, never to interpret development.** No AI involvement. Status Not yet / Tried it / Couldn't try it, plus optional notes prompted “What did you notice? (For example, what your child did, said or enjoyed.)”.
6. **Download:** Word and PDF (Section 4.8), with the optional original-story checkbox, unchecked by default, labeled **“Also include everything I originally wrote”** and explained as: “Add your full, unorganized description at the end of the document, so your doctor can read your exact words if needed.”
7. **Draft continuity:** autosave all draft fields to `sessionStorage` after changes. Usually survives refresh in the same tab; not guaranteed after closing the tab, private mode, or storage cleanup. Show a browser leave-page warning when closing the tab with an unsaved story. **Clear My Information** clears storage and memory. **Download My Draft** gives a plain-text `.txt` marked as a draft; import is out of scope. Never say work is safely or permanently saved. Files a parent downloads are theirs to store and share.

**Static safety notice** (always visible on the start and preview screens; not AI-triggered): *“This tool does not check for urgent problems. If your child has lost skills they used to have, has a seizure, or you are worried about their safety, contact a doctor now instead of waiting for your appointment.”*

## 6. Edge Cases & Error Handling

| Scenario | Required behavior |
|---|---|
| Blank, whitespace-only, <20 or >5000 characters | Clear validation message; no AI call; never truncate silently |
| Invalid age, >1 decimal, or unexpected unit | Clear error; no AI call |
| English, Filipino or Taglish | Accept; preserve wording; no translation; don't convert parents' words into clinical conclusions |
| Parent says “sometimes,” “maybe,” “I don't know,” or attributes to a teacher | Preserve uncertainty and who observed it |
| Contradictory observations | Keep both; may ask one neutral clarification |
| Statements span categories | Split only faithful, non-overlapping source spans; place once by default; leftovers go to Other |
| Medical facts volunteered | Medical and Health; do not ask for missing pregnancy or treatment history by default |
| Empty sections | Omit in preview and export; never “normal,” “delayed,” or “absent” |
| Clarification selection | 0–3, about ambiguity in the reported concern; not just because a category is empty; no diagnosis, urgency or treatment |
| LLM changes punctuation (curly quotes, dashes) | Normalization rule 4.6.1 prevents false rejection |
| Invalid JSON, extra/missing keys, >3 questions, invented quote, translated `text`, blocked term in question | Reject entirely; show retry; keep the draft; no hidden repair |
| LLM/network timeout at 60 s | Friendly error; text and draft kept; retry offered; no duplicate submission |
| Browser without speech recognition (e.g., Firefox) | Hide mic; show typing guidance |
| Microphone permission denied | Explain how to allow it; typing remains usable |
| Recognition ends on silence mid-story | Auto-restart while Start is active; stop on Stop or at 5,000 characters |
| Taglish dictated with one recognizer language | Expect mis-recognized words; parent reviews before submitting; never infer the transcript is accurate |
| Dictation reaches 5,000 characters | Stop listening; show the limit message |
| Parent edits story after generation | Confirm regeneration replaces categories and clarification answers only |
| Parent skips all questions and the activity | Export still works; unanswered questions marked; activity omitted |
| Long document | Wrap and paginate DOCX/PDF cleanly; no clipped content |
| iOS Safari download | PDF and DOCX download or open in a new tab; tested manually |
| Refresh in same tab | Restore draft where storage is available; handle storage exceptions |
| Close tab / restart / cleared storage | Leave-page warning; recovery not guaranteed |
| Narrative contains instructions (“ignore your rules”, “show your key”) | Treated as story text only; never followed |
| Repeated requests from one IP | HTTP 429 after the rate limit with a friendly message |

**Nonfunctional constraints:** server-side secrets only; HTTPS; same-origin CORS; 32 KB body limit; rate limiting (default 10 organize requests per IP per 15 minutes); bounded tokens; provider spending cap; **no logging of request bodies or LLM output**, including in error handlers and the hosting platform's logs; no analytics containing stories; generic errors that never echo input; no audio retained. Clinical rollout would require privacy, security, consent, provider and clinical-governance review beyond this spec.

**Trade-off:** `sessionStorage` and browser speech recognition are not clinical-grade privacy measures. The public demo is not suitable for real patient histories even though it has no server database.

## 7. Acceptance Criteria (Given / When / Then)

| ID | Testable outcome | Test type |
|---|---|---|
| AC-01 | **Given** valid age and a 20–5000-character fictional narrative, **when** Organize My Story is clicked, **then** exactly one request is sent and loading shows until a validated result or error. | UI/integration |
| AC-02 | **Given** invalid age or narrative, **when** submitted, **then** an actionable error appears and no AI request occurs. | Unit/UI |
| AC-03 | **Given** a valid mocked response, **when** processed, **then** all ten keys validate and only populated categories render, in the defined order. | Unit/UI |
| AC-04 | **Given** a narrative including volunteered medical details, **when** categorized, **then** they appear in Medical and Health, other unfitted detail appears in Other, and the original input is unchanged. | Unit + human fidelity review |
| AC-05 | **Given** a mocked response with an invented quote, a missing key, a duplicate question ID, >3 questions, a translated `text`, or a blocked term in a question, **when** validated, **then** it is rejected and the original input remains. | Unit/integration |
| AC-06 | **Given** a response whose quotes differ from the narrative only in curly vs straight quotes, dashes or whitespace, **when** validated, **then** it is accepted. | Unit |
| AC-07 | **Given** one reported concern, **when** questions are generated, **then** at most three neutral questions address real uncertainty, in the narrative's main language, and answer / I don't know / skip all work. | UI + clinician review |
| AC-08 | **Given** a browser with speech recognition and microphone permission, **when** the parent presses Start and speaks, **then** text appears in the same editable field, counts toward 5,000 characters, continues after a pause until Stop, and nothing is submitted automatically. | Manual browser test (Chrome desktop, Chrome Android, Safari iOS) |
| AC-09 | **Given** a browser without speech recognition or a denied permission, **when** the page loads or Start is pressed, **then** a clear message appears and typing works normally. | Manual browser test (Firefox + denied permission) |
| AC-10 | **Given** dictation set to `fil-PH` and to `en-PH`, **when** a fictional Taglish story is spoken, **then** the transcript is editable before submission. Record word-error notes for the report; no accuracy threshold is claimed. | Manual |
| AC-11 | **Given** an existing categorized draft, **when** Edit My Story is used and the text changed, **then** a warning appears before regeneration, and priorities and activity fields are kept. | UI/integration |
| AC-12 | **Given** entered questions, expectations, clarifications and activity status, **when** either document is generated, **then** both PDF and DOCX contain the current fields, the parent-reported/AI-assistance label, and omit an unselected activity. | Export/manual |
| AC-13 | **Given** include-original unchecked, **when** either document downloads, **then** the original narrative is absent; when checked, the exact text is appended at the end of both formats. | Export/unit |
| AC-14 | **Given** local date 2026-11-22, **when** downloading, **then** the default base filename is `story-2026-11-22` with the correct `.docx`/`.pdf` extension, and a filename containing `/` or `:` is sanitized. | Unit |
| AC-15 | **Given** a refresh in the same tab with storage available, **when** the page reloads, **then** the draft is restored; **when** Clear My Information is selected, **then** draft and storage are cleared. | UI/integration |
| AC-16 | **Given** a failed or 60-second-timed-out AI request, **when** the error occurs, **then** the UI offers retry and keeps the text, without exposing internal errors or secrets. | Integration |
| AC-17 | **Given** a chosen option (Connect / Play / Talk) and a valid age, **when** the preview shows it and its status or notes are recorded, **then** only that option's example for the child's age band is shown, and the option, example text, status and notes appear accurately in exports; nothing is exported when no option is chosen; the LLM never creates activities. | Unit/UI |
| AC-18 | **Given** 11 requests from one IP within 15 minutes, **when** the 11th arrives, **then** the server returns 429 and the UI shows a friendly message. | Integration |
| AC-19 | **Given** the start and preview screens, **when** displayed, **then** the fictional-data notice and the static safety notice are visible. | UI |
| AC-20 | **Given** a code commit, **when** GitHub Actions runs, **then** typecheck, unit tests and build pass. | CI |
| AC-21 | **Given** the public app and repository, **when** inspected, **then** the safety notices, `.env.example`, `CLAUDE.md` and `.cursorrules` are present, and no credentials, narrative logs or real clinical data are exposed. | Manual security QA |

## 8. Evaluation (not automated assurance)

`npm run eval` runs 8 synthetic narratives (English, Filipino, Taglish; some written by non-clinicians) against the configured real model, outside CI. It reports per case:

- response accepted or rejected, and why;
- **coverage**: share of narrative characters covered by at least one `sourceQuote`;
- category counts and clarification questions, for human review, including overlapping or duplicated spans (rule 4.6.3, which the validator does not check).

Three clinician reviewers then rate, blind to source, the raw narrative, a conventional form and the AI output for: missing substantive statements, category placement, fidelity, preserved uncertainty and attribution, question relevance, and reading time. Targets, matching the PRD and the Validation Report's Test T2: **zero material fabricated facts; ≥95% of items faithful; review time no worse than the form.** Source checks and schemas do **not** prove clinical safety or accuracy.

## 9. Definition of Done

- Live HTTPS public demo using fictional cases only.
- Typed **and** voice story entry, with counter, language choice, fallback and no auto-submit.
- One-call AI categorization into ten categories plus ≤3 clarification questions, validated server-side.
- Edit My Story with explicit regeneration; parent priorities; one optional serve-and-return activity.
- DOCX and PDF export from the same state, optional original narrative, `story-YYYY-MM-DD` filename.
- Tab-scoped autosave, Clear My Information, plain-text draft download.
- Static safety notice and fictional-data notice visible.
- Unit/integration tests passing in CI; `npm run eval` run once with results recorded; manual voice tests on three browsers.
- Repo: README, this `spec.md`, PRD, architecture notes, `.env.example`, `CLAUDE.md`, `.cursorrules`, `.github/workflows/ci.yml`, ≥5 meaningful commits; no secrets in the browser.
- Two-minute demo of one full fictional workflow, **including dictation**.

## 10. Change Log

**v1.0 → v1.1** (Phase 4 AI review): ten fixed categories including Medical and Health; read-only preview with Edit My Story and regeneration warning; DOCX + PDF export with optional original narrative; `story-YYYY-MM-DD` filename; optional browser voice dictation; 60-second server timeout; `sessionStorage` draft recovery, Clear My Information and `.txt` draft download; new acceptance tests for these.

**v1.3 → v1.4** (this version):

| Area | Change | Reason |
|---|---|---|
| Optional activity (5 step 5, 4.7, 4.8, AC-17) | The three placeholder activities are replaced by the clinician-approved “In the meantime, connect, play and talk” serve-and-return content: Connect / Play / Talk, each with example text for six age bands; `activityId` is `'connect' \| 'play' \| 'talk'`; export includes the option's example text | Clinician-approved, practical, age-appropriate ideas for families waiting for an appointment |
| Age use (5 step 5) | Age chooses the example age band only, never interpreted | Keeps the tool non-diagnostic |

**v1.2 → v1.3**:

| Area | Change | Reason |
|---|---|---|
| `text` check (4.6.2) | Words of `text` must equal those of `sourceQuote`, optionally minus one leading connector from a fixed list (*and, then, also, so, tapos, saka*); “at” excluded because it is also an English preposition; the prompt names the same six connectors and forbids dropping any other word, especially negations | The earlier contiguous-subsequence check accepted dropped negations (“does not point” → “point”) and dropped trailing words |
| Splitting (4.6.3) | Non-overlap is guided by the prompt and checked in human evaluation, not enforced by the validator | Repeated phrases in a story make a deterministic overlap check unreliable |
| Category scopes (4.4) | Home languages → Communication; Movement is motor skills and coordination only; Daily Living is eating, dressing, toileting and routines; Medical and Health adds sleep (including amount), screen/gadget time, amount of exercise, and previous assessments, diagnoses and therapies; family situation → Other | Matches the clinician-reviewed prompt `history-organizer.v1` (22 Nov 2026) |

**v1.1 → v1.2**:

| Area | Change | Reason |
|---|---|---|
| Voice input | Promoted to a core feature; added language selector (`en-PH`/`fil-PH`), interim text, auto-restart after silence, error handling, Taglish caveat, three-browser manual tests (AC-08–AC-10) | Typing long narratives is a barrier for parents |
| Quote matching | Normalization now covers Unicode NFC, curly quotes, dashes and ellipses, not only whitespace (AC-06) | LLMs often change punctuation, which would cause false rejections |
| `text` field | Defined “minimally cleaned” precisely and added a check against `sourceQuote`; no translation | Prevents paraphrase slipping past validation |
| Main Concerns | Limited to statements the parent frames as worries | Keeps categorization from becoming interpretation |
| Clarification questions | Narrative's language; reason shown as helper text; deny-list and URL screening on questions only; length caps | Neutrality check without censoring parents' own words |
| Safety | Static, always-visible safety notice for lost skills, seizures or safety worries (AC-19) | No AI triage, but a safe path for urgent situations |
| Writing support | Guiding prompts in English and Filipino | Reduces blank-page drop-off |
| Hardening | 32 KB body limit, same-origin CORS, spending cap, 429 handling (AC-18), no logging in error handlers or host logs | Public endpoint with a paid API key |
| AI settings | Structured output, temperature ≤0.2, bounded tokens, versioned prompt file, prompt version and model in metadata | Reproducibility |
| Export | AI-assistance disclosure label; Unicode font for Filipino characters; iOS Safari check | Transparency for clinicians; reliable downloads |
| Age | Up to one decimal place allowed | Parents say “2 and a half” |
| Evaluation | `npm run eval` with coverage metric, linked to Validation Report Test T2 and PRD metrics | Mocked tests prove plumbing, not fidelity |
| Repo | `CLAUDE.md` and `.cursorrules` required | Course rubric |
| Delivery path | Stated assumption: parent brings or sends the file | Clarifies what the MVP does and does not do |
