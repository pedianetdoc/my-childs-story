/**
 * Client for POST /api/organize-story (spec 4.3, AC-01, AC-16, AC-18).
 *
 * Error messages are fixed client-side wording chosen by HTTP status only; the
 * server's response body is never shown, so internal details cannot leak.
 */
import {
  OrganizeStoryResponseSchema,
  type OrganizeStoryRequest,
  type OrganizeStoryResult,
} from '@my-childs-story/shared';

export type OrganizeErrorKind = 'rate_limited' | 'timeout' | 'invalid_request' | 'failed';

export type OrganizeOutcome =
  | { ok: true; result: OrganizeStoryResult }
  | { ok: false; kind: OrganizeErrorKind; message: string };

export const ERROR_MESSAGES: Record<OrganizeErrorKind, string> = {
  rate_limited:
    'You have sent several stories in a short time. Please wait a few minutes, then try again. Your text is still here.',
  timeout: 'Organizing your story took too long. Your text is still here. Please try again.',
  invalid_request: 'Please check the age and the story, then try again. Your text is still here.',
  failed: 'We could not organize your story this time. Your text is still here. Please try again.',
};

/** A little longer than the server's 60 s LLM timeout, so the server answers first. */
export const CLIENT_TIMEOUT_MS = 70_000;

function failure(kind: OrganizeErrorKind): OrganizeOutcome {
  return { ok: false, kind, message: ERROR_MESSAGES[kind] };
}

function kindForStatus(status: number): OrganizeErrorKind {
  if (status === 429) return 'rate_limited';
  if (status === 504 || status === 408) return 'timeout';
  if (status === 400 || status === 413) return 'invalid_request';
  return 'failed';
}

function isResult(value: unknown): value is OrganizeStoryResult {
  if (typeof value !== 'object' || value === null || !('meta' in value)) return false;
  const { meta, ...rest } = value as { meta: unknown };
  const metaOk =
    typeof meta === 'object' &&
    meta !== null &&
    typeof (meta as { promptVersion?: unknown }).promptVersion === 'string' &&
    typeof (meta as { model?: unknown }).model === 'string';
  return metaOk && OrganizeStoryResponseSchema.safeParse(rest).success;
}

export async function organizeStoryRequest(
  request: OrganizeStoryRequest,
  { fetchImpl = fetch, timeoutMs = CLIENT_TIMEOUT_MS }: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<OrganizeOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetchImpl('/api/organize-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
    } catch {
      return failure(controller.signal.aborted ? 'timeout' : 'failed');
    }

    if (!response.ok) return failure(kindForStatus(response.status));

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return failure('failed');
    }
    return isResult(body) ? { ok: true, result: body } : failure('failed');
  } finally {
    clearTimeout(timer);
  }
}
