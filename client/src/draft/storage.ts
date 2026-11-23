/**
 * Tab-scoped draft persistence — spec section 5 step 7 (AC-15).
 *
 * sessionStorage only. Every call is wrapped in try/catch: storage can be
 * missing, blocked (private mode), full, or hold data from an older version.
 * Anything that does not look like a valid draft is discarded, never repaired.
 */
import {
  CLARIFICATION_IDS,
  OrganizeStoryResponseSchema,
  type OrganizeStoryResult,
} from '@my-childs-story/shared';
import { ACTIVITIES, ACTIVITY_STATUS_LABELS } from '../content/activities';
import { emptyDraft, type Draft } from './draft';

export const STORAGE_KEY = 'my-childs-story.draft.v1';

function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null; // e.g. SecurityError when storage is blocked
  }
}

const isString = (v: unknown): v is string => typeof v === 'string';
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function isResult(value: unknown): value is OrganizeStoryResult {
  if (!isRecord(value)) return false;
  const { meta, ...rest } = value;
  return (
    isRecord(meta) &&
    isString(meta.promptVersion) &&
    isString(meta.model) &&
    OrganizeStoryResponseSchema.safeParse(rest).success
  );
}

function isAnswers(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(
    ([id, answer]) =>
      (CLARIFICATION_IDS as readonly string[]).includes(id) &&
      isRecord(answer) &&
      ['answered', 'unknown', 'skipped'].includes(answer.status as string) &&
      (answer.answer === undefined || isString(answer.answer)),
  );
}

function isActivity(value: unknown): boolean {
  if (value === null) return true;
  return (
    isRecord(value) &&
    ACTIVITIES.some((a) => a.id === value.activityId) &&
    Object.hasOwn(ACTIVITY_STATUS_LABELS, value.status as string) &&
    isString(value.notes)
  );
}

export function isDraft(value: unknown): value is Draft {
  if (!isRecord(value)) return false;
  return (
    isString(value.ageText) &&
    (value.ageUnit === 'months' || value.ageUnit === 'years') &&
    isString(value.originalNarrative) &&
    (value.dictationLanguage === 'en-PH' || value.dictationLanguage === 'fil-PH') &&
    (value.result === null || isResult(value.result)) &&
    isAnswers(value.clarificationAnswers) &&
    isString(value.parentQuestions) &&
    isString(value.visitExpectations) &&
    isActivity(value.activity) &&
    typeof value.includeOriginalNarrative === 'boolean' &&
    isString(value.exportBaseName) &&
    (value.screen === 'input' || value.screen === 'preview')
  );
}

/** Returns the saved draft, or null if there is none or it cannot be used. */
export function loadDraft(): Draft | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isDraft(parsed)) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }
    // The preview needs a result; otherwise reopen the story screen.
    return parsed.result ? parsed : { ...parsed, screen: 'input' };
  } catch {
    return null;
  }
}

/** Saves the draft for this tab. Returns false if storage is unavailable or full. */
export function saveDraft(draft: Draft): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(): void {
  const storage = getStorage();
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing else to do; memory is cleared by the caller.
  }
}

/** True when the draft holds anything the parent typed or chose. */
export function hasContent(draft: Draft): boolean {
  const empty = emptyDraft();
  return (
    draft.originalNarrative.trim() !== '' ||
    draft.ageText.trim() !== '' ||
    draft.result !== null ||
    draft.parentQuestions.trim() !== '' ||
    draft.visitExpectations.trim() !== '' ||
    draft.activity !== null ||
    draft.exportBaseName !== empty.exportBaseName
  );
}
