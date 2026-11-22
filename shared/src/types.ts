/**
 * Shared request/response/draft types — spec.md sections 4.3, 4.5 and 4.7.
 * Names follow the spec exactly.
 */
import type { HistoryCategory } from './categories.js';
import type { CLARIFICATION_IDS } from './limits.js';

export type AgeUnit = 'months' | 'years';

/** POST /api/organize-story request body (spec 4.3). */
export type OrganizeStoryRequest = {
  childAge: { value: number; unit: AgeUnit };
  narrative: string;
};

/** One parent statement placed in a category (spec 4.5). */
export type ReportedItem = {
  text: string;
  sourceQuote: string;
};

export type ClarificationId = (typeof CLARIFICATION_IDS)[number];

/** One neutral clarification question (spec 4.5). */
export type Clarification = {
  id: ClarificationId;
  question: string;
  reason: string;
};

/** Strict JSON shape expected from the LLM (spec 4.5). */
export type OrganizeStoryResponse = {
  categories: Record<HistoryCategory, ReportedItem[]>;
  clarificationQuestions: Clarification[];
};

export type OrganizeStoryMeta = { promptVersion: string; model: string };

/** Added by the server after validation, not by the LLM (spec 4.5). */
export type OrganizeStoryResult = OrganizeStoryResponse & {
  meta: OrganizeStoryMeta;
};

export type DictationLanguage = 'en-PH' | 'fil-PH';

export type ActivityId = 'communication_moment' | 'child_led_interaction' | 'difficult_moment';

export type ActivityStatus = 'not_yet' | 'tried' | 'could_not_try';

export type ClarificationAnswerStatus = 'answered' | 'unknown' | 'skipped';

/** Parent-owned draft held in the client (spec 4.7). Never sent for another LLM round. */
export type PreparationDraft = {
  childAge: OrganizeStoryRequest['childAge'];
  originalNarrative: string;
  dictationLanguage: DictationLanguage;
  categories: Record<HistoryCategory, ReportedItem[]>;
  clarificationQuestions: Clarification[];
  clarificationAnswers: Array<{
    id: ClarificationId;
    status: ClarificationAnswerStatus;
    answer?: string;
  }>;
  parentQuestions: string;
  visitExpectations: string;
  activity?: {
    activityId: ActivityId;
    status: ActivityStatus;
    notes?: string;
  };
  includeOriginalNarrative: boolean;
  exportBaseName?: string;
  meta?: OrganizeStoryMeta;
};
