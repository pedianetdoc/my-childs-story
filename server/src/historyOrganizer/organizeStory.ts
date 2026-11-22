/**
 * history-organizer: builds the request, calls the provider adapter, validates,
 * and returns an OrganizeStoryResult. No Express code here.
 */
import type { OrganizeStoryRequest, OrganizeStoryResult } from '@my-childs-story/shared';
import type { LlmProvider } from '../llm/providerAdapter.js';
import { validateOrganizeStoryResponse, type ValidationIssueCode } from '../validation/index.js';
import { PROMPT_VERSION, buildUserMessage } from './prompt.js';

export type OrganizeStoryDeps = {
  provider: LlmProvider;
  systemPrompt: string;
  timeoutMs: number;
};

export type OrganizeStoryErrorCode =
  | 'timeout' // no answer within timeoutMs (spec: 60 s default)
  | 'provider_error' // network/HTTP/shape error from the provider
  | 'invalid_json' // content was not JSON
  | 'invalid_response'; // JSON failed spec 4.6 validation; rejected whole

export type OrganizeStoryOutcome =
  | { ok: true; result: OrganizeStoryResult }
  | { ok: false; error: OrganizeStoryErrorCode; issueCodes?: ValidationIssueCode[] };

class TimeoutSignal extends Error {}

/**
 * `request` must already have passed OrganizeStoryRequestSchema. The narrative is
 * trimmed once here and the same string is used for the prompt and for validation.
 */
export async function organizeStory(
  request: OrganizeStoryRequest,
  deps: OrganizeStoryDeps,
): Promise<OrganizeStoryOutcome> {
  const narrative = request.narrative.trim();
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new TimeoutSignal());
    }, deps.timeoutMs);
  });

  let content: string;
  let model: string;
  try {
    const completion = await Promise.race([
      deps.provider.complete({
        system: deps.systemPrompt,
        user: buildUserMessage({ childAge: request.childAge, narrative }),
        signal: controller.signal,
      }),
      timeout,
    ]);
    content = completion.content;
    model = completion.model;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof TimeoutSignal || controller.signal.aborted ? 'timeout' : 'provider_error',
    };
  } finally {
    clearTimeout(timer);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { ok: false, error: 'invalid_json' };
  }

  const validation = validateOrganizeStoryResponse(parsed, narrative);
  if (!validation.ok) {
    return {
      ok: false,
      error: 'invalid_response',
      issueCodes: [...new Set(validation.issues.map((issue) => issue.code))],
    };
  }

  return {
    ok: true,
    result: { ...validation.value, meta: { promptVersion: PROMPT_VERSION, model } },
  };
}
