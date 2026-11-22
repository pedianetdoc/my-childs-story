/**
 * POST /api/organize-story — spec.md 4.3, 6 and AC-01/02/16/18.
 *
 * Privacy: never log request bodies, narratives or LLM output — not here, not in
 * error handlers. The only log line is status, duration and an error category.
 * Error responses are generic and never echo the input.
 */
import express, { type Request, type Response, type Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { OrganizeStoryRequestSchema } from '@my-childs-story/shared';
import { JSON_BODY_LIMIT, RATE_LIMIT_WINDOW_MS } from '../config.js';
import { organizeStory, type OrganizeStoryErrorCode } from '../historyOrganizer/index.js';
import type { LlmProvider } from '../llm/providerAdapter.js';

export type OrganizeStoryRouteOptions = {
  provider: LlmProvider | null;
  systemPrompt: string;
  timeoutMs: number;
  rateLimitMax: number;
  rateLimitWindowMs?: number;
  log?: (line: string) => void;
};

export const MESSAGES = {
  invalid_request: 'Please check the age and the story, then try again.',
  rate_limited:
    'You have sent several stories in a short time. Please wait a few minutes, then try again. Your text is still here.',
  not_configured: 'Story organizing is not available right now. Your text is still here.',
  timeout: 'Organizing your story took too long. Your text is still here. Please try again.',
  failed: 'We could not organize your story this time. Your text is still here. Please try again.',
} as const;

const OUTCOME_STATUS: Record<OrganizeStoryErrorCode, { status: number; error: string }> = {
  timeout: { status: 504, error: 'timeout' },
  provider_error: { status: 502, error: 'upstream_error' },
  invalid_json: { status: 502, error: 'invalid_ai_response' },
  invalid_response: { status: 502, error: 'invalid_ai_response' },
};

/**
 * Our own fixed wording only. Zod's default messages can echo input (for example
 * unrecognized key names), so they are never passed through.
 */
function friendlyIssueMessage(issue: { code: string; message: string; path: PropertyKey[] }): string {
  if (issue.code === 'custom') return issue.message; // written in shared/src/schemas.ts
  const field = issue.path[0];
  if (field === 'childAge') return 'Please enter an age from 0 to 216 months or 0 to 18 years.';
  if (field === 'narrative') return 'Please write or dictate your child’s story.';
  return MESSAGES.invalid_request;
}

export function createOrganizeStoryRouter(options: OrganizeStoryRouteOptions): Router {
  const log = options.log ?? ((line: string) => console.info(line));
  const router = express.Router();

  const logResult = (startedAt: number, status: number, category?: string) => {
    const durationMs = Date.now() - startedAt;
    log(
      `organize-story status=${status} durationMs=${durationMs}${category ? ` category=${category}` : ''}`,
    );
  };

  const limiter = rateLimit({
    windowMs: options.rateLimitWindowMs ?? RATE_LIMIT_WINDOW_MS,
    limit: options.rateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      logResult(Date.now(), 429, 'rate_limited');
      res.status(429).json({ error: 'rate_limited', message: MESSAGES.rate_limited });
    },
  });

  router.post(
    '/organize-story',
    limiter,
    express.json({ limit: JSON_BODY_LIMIT }),
    async (req: Request, res: Response) => {
      const startedAt = Date.now();

      const parsed = OrganizeStoryRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        logResult(startedAt, 400, 'invalid_request');
        res.status(400).json({
          error: 'invalid_request',
          message: MESSAGES.invalid_request,
          // Field paths and our own fixed messages only; never the submitted values.
          issues: parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: friendlyIssueMessage(issue),
          })),
        });
        return;
      }

      if (!options.provider) {
        logResult(startedAt, 503, 'not_configured');
        res.status(503).json({ error: 'not_configured', message: MESSAGES.not_configured });
        return;
      }

      const outcome = await organizeStory(parsed.data, {
        provider: options.provider,
        systemPrompt: options.systemPrompt,
        timeoutMs: options.timeoutMs,
      });

      if (!outcome.ok) {
        const { status, error } = OUTCOME_STATUS[outcome.error];
        const detail = outcome.issueCodes ? `${outcome.error}:${outcome.issueCodes.join(',')}` : outcome.error;
        logResult(startedAt, status, detail);
        res
          .status(status)
          .json({ error, message: outcome.error === 'timeout' ? MESSAGES.timeout : MESSAGES.failed });
        return;
      }

      logResult(startedAt, 200);
      res.status(200).json(outcome.result);
    },
  );

  return router;
}
